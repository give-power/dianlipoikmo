import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { workerId, project } = await req.json();
  if (!workerId) return Response.json({ error: "workerId required" }, { status: 400 });

  // RH1: validate worker exists
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) return Response.json({ error: "工人不存在" }, { status: 404 });

  // RC4 + RH4: idempotent — same worker same UTC day returns existing record
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.checkIn.findFirst({
    where: { workerId, createdAt: { gte: todayUTC } },
  });
  if (existing) return Response.json(existing);

  const checkIn = await prisma.checkIn.create({
    data: { workerId, project: project ?? worker.project },
  });
  return Response.json(checkIn);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const year = searchParams.get("year");

  // RH4: UTC-based day boundary
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  let where: Record<string, unknown> = {};
  if (year) {
    const y = Number(year);
    where = {
      createdAt: {
        gte: new Date(`${y}-01-01T00:00:00Z`),
        lt: new Date(`${y + 1}-01-01T00:00:00Z`),
      },
    };
  } else if (!all) {
    where = { createdAt: { gte: todayUTC } };
  }

  const checkIns = await prisma.checkIn.findMany({
    where,
    include: { worker: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(checkIns);
}
