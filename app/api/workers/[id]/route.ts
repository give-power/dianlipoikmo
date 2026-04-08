import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const worker = await prisma.worker.findUnique({ where: { id } });
  if (!worker) return Response.json({ error: "Worker not found" }, { status: 404 });
  return Response.json(worker);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, project, phone, idCard, insuranceInfo, wageType, wageRate, loginPin } = body;
    const worker = await prisma.worker.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(project !== undefined && { project }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(idCard !== undefined && { idCard: idCard || null }),
        ...(insuranceInfo !== undefined && { insuranceInfo }),
        ...(wageType !== undefined && { wageType: wageType || null }),
        ...(wageRate !== undefined && { wageRate: wageRate ? Number(wageRate) : null }),
        ...(loginPin !== undefined && { loginPin: loginPin || null }),
      },
    });
    return Response.json(worker);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: `更新失败：${msg}` }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // RC5: check for related records before deleting
    const [checkinCount, reportCount, correctionCount] = await Promise.all([
      prisma.checkIn.count({ where: { workerId: id } }),
      prisma.report.count({ where: { workerId: id } }),
      prisma.correction.count({ where: { workerId: id } }),
    ]);

    const total = checkinCount + reportCount + correctionCount;
    if (total > 0) {
      return Response.json(
        {
          error: `该工人有关联记录（打卡 ${checkinCount} 条、报量 ${reportCount} 条、纠偏 ${correctionCount} 条），无法直接删除`,
        },
        { status: 409 }
      );
    }

    await prisma.worker.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("worker delete error:", e);
    return Response.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
