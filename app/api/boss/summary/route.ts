import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // RH5: rate limit — 5 req/min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 5, 60_000)) {
    return Response.json({ content: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    if (!process.env.VOLC_API_KEY) {
      return Response.json({ content: "AI 服务未配置" }, { status: 500 });
    }

    // RH4: UTC day boundary
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const [checkIns, reports, visas, corrections] = await Promise.all([
      prisma.checkIn.findMany({ where: { createdAt: { gte: todayUTC } }, include: { worker: true } }),
      prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.visa.findMany({ where: { status: "pending" } }),
      prisma.correction.findMany({ where: { status: "pending" } }),
    ]);

    const pendingReports = reports.filter((r) => r.status === "pending");
    const approvedReports = reports.filter((r) => r.status === "approved");
    const visaTotal = visas.reduce((s, v) => s + v.amount, 0);

    const dataContext = `
今日实时数据（${new Date().toLocaleDateString("zh-CN")}）：
- 在场工人：${checkIns.length} 人（${checkIns.map((c) => c.worker.name).join("、") || "暂无"}）
- 今日报量：共 ${reports.length} 条，待审 ${pendingReports.length} 条，已批 ${approvedReports.length} 条
- 待批签证：${visas.length} 笔，合计 ¥${visaTotal.toLocaleString()}
- 待确认纠偏：${corrections.length} 条
    `.trim();

    const SYSTEM_PROMPT = `你是 PowerLink 工地 AI 助手。根据下面的真实数据，生成一份简洁的老板汇报。
要求：≤80字，口语化，直接，不废话，不加标题，不用"如有问题请联系"类套话。`;

    const res = await fetch(`${process.env.VOLC_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOLC_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.VOLC_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: dataContext },
        ],
        max_tokens: 200,
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      return Response.json({ content: "AI 服务暂时不可用，请稍后重试。" }, { status: 200 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "今日数据汇总生成失败，请稍后重试。";
    return Response.json({ content });
  } catch (e) {
    console.error("boss/summary error:", e);
    return Response.json({ content: "网络异常，请稍后重试。" }, { status: 200 });
  }
}
