import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const corrections = await prisma.correction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json(corrections);
}

export async function POST(req: NextRequest) {
  const { workerId, workerName, original, corrected, reason, reportId } = await req.json();

  if (!workerId || !original || !corrected || !reason) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // RH1: validate worker exists
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) return Response.json({ error: "工人不存在" }, { status: 404 });

  const correction = await prisma.correction.create({
    data: {
      workerId,
      workerName: workerName ?? worker.name,
      original,
      corrected,
      reason,
      reportId: reportId ? Number(reportId) : null,
    },
  });
  return Response.json(correction);
}
