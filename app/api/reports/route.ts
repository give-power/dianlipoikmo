import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const workerId = searchParams.get("workerId");
  const year = searchParams.get("year");
  const limitParam = searchParams.get("limit");

  const where: Record<string, unknown> = {};
  if (project) where.project = project;
  if (workerId) where.workerId = workerId;
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
  const { workerId, workerName, project, task, spec, qty, photoPath } = body;

  if (!workerId || !task || !spec || !qty) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // RH1: validate worker exists
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) return Response.json({ error: "工人不存在" }, { status: 404 });

  const report = await prisma.report.create({
    data: {
      workerId,
      workerName: workerName ?? worker.name,
      project: project ?? worker.project,
      task,
      spec,
      qty,
      photoPath: photoPath ?? null,
    },
  });
  return Response.json(report);
}
