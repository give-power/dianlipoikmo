import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const workerId = searchParams.get("workerId");
  const year = searchParams.get("year");
  const status = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (project) where.project = project;
  if (workerId) where.workerId = workerId;
  if (status && status !== "all") where.status = status;
  if (year) {
    const y = Number(year);
    where.createdAt = {
      gte: new Date(`${y}-01-01T00:00:00Z`),
      lt: new Date(`${y + 1}-01-01T00:00:00Z`),
    };
  }

  const reports = await prisma.report.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: "desc" },
    take: limitParam ? Number(limitParam) : 100,
  });
  return Response.json(reports);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workerId, workerName, project, task, spec, qty, photoUrls, gpsLat, gpsLng } = body;

  if (!workerId || !task || !qty) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) return Response.json({ error: "工人不存在" }, { status: 404 });

  const resolvedProject = project ?? worker.project;

  // ── 计价引擎：自动匹配单价（Task #4）──────────────────────────────────────
  let priceItemId: number | null = null;
  let unitPrice: number | null = null;
  let totalValue: number | null = null;

  try {
    // 候选：绑定该项目或全局通用的激活价格库中所有条目
    const candidates = await prisma.priceItem.findMany({
      where: {
        library: {
          isActive: true,
          OR: [{ projectCode: resolvedProject }, { projectCode: null }],
        },
      },
    });

    if (candidates.length > 0) {
      const needle = `${task} ${spec ?? ""}`.toLowerCase();
      // 简单评分：关键词命中数
      let best: (typeof candidates)[0] | null = null;
      let bestScore = 0;

      for (const item of candidates) {
        let score = 0;
        const haystack = `${item.name} ${item.code} ${(item.keywords ?? []).join(" ")} ${item.spec ?? ""}`.toLowerCase();
        for (const word of needle.split(/\s+/).filter(Boolean)) {
          if (haystack.includes(word)) score++;
        }
        if (score > bestScore) { bestScore = score; best = item; }
      }

      if (best && bestScore > 0) {
        priceItemId = best.id;
        unitPrice = best.unitPrice;
        const qtyNum = parseFloat(qty);
        if (!isNaN(qtyNum)) totalValue = Math.round(qtyNum * best.unitPrice * 100) / 100;
      }
    }
  } catch {
    // 匹配失败不阻断提交
  }
  // ─────────────────────────────────────────────────────────────────────────

  const report = await prisma.report.create({
    data: {
      workerId,
      workerName: workerName ?? worker.name,
      project: resolvedProject,
      task,
      spec: spec ?? "—",
      qty,
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
      gpsLat: gpsLat ?? null,
      gpsLng: gpsLng ?? null,
      priceItemId,
      unitPrice,
      totalValue,
    },
  });
  return Response.json(report);
}
