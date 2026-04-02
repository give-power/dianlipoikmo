import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `你是 PowerLink 工地报量助手，负责引导工人快速完成一条工程量上报。

目标：收集完整的报量记录，必须包含：
1. 工序（如：电缆敷设、接地安装、土方开挖、配电箱安装、做头）
2. 规格（如：VV22-3×70、DN300、XL-21型）
3. 数量（如：50m、2套、1台）

对话规则：
- 每次只说一句话，≤20字，口语化
- 支持电力行话：做头=电缆终端头，放缆=电缆敷设，开挖=沟槽开挖
- 工序/规格/数量缺哪项就追问哪项
- 三项都收集完整时，回复格式：好，记上了。[DONE]{"工序":"...","规格":"...","数量":"..."}
- [DONE]后面紧跟JSON，不换行，不加其他文字

开场白就是：今天做了啥？`;

export async function POST(req: NextRequest) {
  // RH5: rate limit — 20 req/min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 20, 60_000)) {
    return Response.json({ content: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages ?? [];

    if (!process.env.VOLC_API_KEY) {
      return Response.json({ content: "AI服务未配置" }, { status: 500 });
    }

    const res = await fetch(`${process.env.VOLC_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOLC_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.VOLC_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Volc API error:", err);
      return Response.json({ content: "网络不好，再说一遍？" }, { status: 200 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "好的，继续。";
    return Response.json({ content });
  } catch (e) {
    console.error("worker/chat error:", e);
    return Response.json({ content: "网络不好，再说一遍？" }, { status: 200 });
  }
}
