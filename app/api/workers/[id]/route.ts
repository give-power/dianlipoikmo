import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

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
