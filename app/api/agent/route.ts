import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // RH5: rate limit — 30 req/min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // RH4: UTC day boundary
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const [checkins, reports, visas, corrections, projects] = await Promise.all([
      prisma.checkIn.findMany({
        where: { createdAt: { gte: todayUTC } },
        include: { worker: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.visa.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.correction.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const todayReports = reports.filter((r) => r.createdAt >= todayUTC);
    const pendingVisas = visas.filter((v) => v.status === "pending");
    const pendingVisaTotal = pendingVisas.reduce((s, v) => s + v.amount, 0);
    const approvedVisaTotal = visas
      .filter((v) => v.status === "approved")
      .reduce((s, v) => s + v.amount, 0);
    const pendingCorrections = corrections.filter((c) => c.status === "pending");

    const checkinByProject: Record<string, string[]> = {};
    checkins.forEach((ci) => {
      if (!checkinByProject[ci.project]) checkinByProject[ci.project] = [];
      checkinByProject[ci.project].push(ci.worker.name);
    });

    const systemPrompt = `你是 PowerLink OS 的智能工程数据助手，专注于配电施工项目的实时数据分析。

## 实时项目数据（当前时刻）

### 在施项目概况
${projects.map((p) => {
  const usedPct = p.budget > 0 ? ((p.spent / p.budget) * 100).toFixed(1) : "—";
  const budgetW = (p.budget / 10000).toFixed(1);
  const spentW = (p.spent / 10000).toFixed(1);
  const statusLabel = p.status === "active" ? "进行中" : p.status === "pending" ? "待开工" : p.status;
  return `- ${p.name}（${p.code}）：预算 ¥${budgetW}万，已用 ¥${spentW}万，进度 ${usedPct}%，利润率 ${p.profitRate}%，状态 ${statusLabel}`;
}).join("\n")}

### 今日打卡（共 ${checkins.length} 人）
${
  Object.entries(checkinByProject)
    .map(([proj, names]) => `- ${proj}：${names.join("、")}（${names.length}人）`)
    .join("\n") || "暂无打卡记录"
}

### 今日报量（共 ${todayReports.length} 条）
${
  todayReports
    .slice(0, 12)
    .map((r) => `- ${r.workerName}：${r.task} ${r.spec} ${r.qty}（${r.project}）`)
    .join("\n") || "暂无今日报量"
}

### 签证情况
- 待确认签证：${pendingVisas.length} 项，合计 ¥${pendingVisaTotal.toLocaleString()}
- 已批复签证总额：¥${approvedVisaTotal.toLocaleString()}
${pendingVisas.slice(0, 5).map((v) => `  · ${v.title}（¥${v.amount.toLocaleString()}）`).join("\n")}

### 纠偏申请
- 待确认：${pendingCorrections.length} 项
${pendingCorrections.slice(0, 3).map((c) => `  · ${c.workerName}：${c.original} → ${c.corrected}`).join("\n")}

## 行为准则
- 基于以上实时数据回答，不要编造数字
- 回答简洁、直接，用中文
- 涉及金额统一用人民币（¥或万元）
- 数据范围外的问题如实说明，不瞎猜`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role === "agent" ? "assistant" : "user",
        content: m.text,
      })),
    ];

    const response = await fetch(
      `${process.env.VOLC_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VOLC_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.VOLC_MODEL,
          messages: apiMessages,
          max_tokens: 600,
          temperature: 0.5,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Volcengine error:", err);
      return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
    }

    const data = await response.json();
    const text =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.message?.reasoning_content ??
      "（无法获取回答，请稍后重试）";

    return NextResponse.json({ text });
  } catch (e) {
    console.error("/api/agent error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
