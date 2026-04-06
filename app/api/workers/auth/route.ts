import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/workers/auth
 * 工人 PIN 登录验证
 * 优先级：loginPin 精确匹配 → 手机号后N位匹配
 * 返回：
 *   - 唯一匹配 → { worker }
 *   - 多个匹配 → { multiple: true, workers: [] }
 *   - 未找到   → 404
 */
export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (!pin || !String(pin).trim()) {
      return Response.json({ error: "请输入PIN" }, { status: 400 });
    }
    const trimmed = String(pin).trim();

    // 1. 精确匹配 loginPin
    const byPin = await prisma.worker.findMany({
      where: { loginPin: trimmed },
    });
    if (byPin.length === 1) return Response.json(byPin[0]);
    if (byPin.length > 1) return Response.json({ multiple: true, workers: byPin });

    // 2. 手机号后 N 位匹配（N = pin 长度）
    const allWorkers = await prisma.worker.findMany({
      where: { phone: { not: null } },
    });
    const byPhone = allWorkers.filter(
      (w) => w.phone && w.phone.endsWith(trimmed)
    );
    if (byPhone.length === 1) return Response.json(byPhone[0]);
    if (byPhone.length > 1) return Response.json({ multiple: true, workers: byPhone });

    return Response.json(
      { error: "未找到匹配工人，请联系班组长设置您的PIN" },
      { status: 404 }
    );
  } catch (e) {
    console.error("[POST /api/workers/auth]", e);
    return Response.json({ error: e instanceof Error ? e.message : "验证失败" }, { status: 500 });
  }
}
