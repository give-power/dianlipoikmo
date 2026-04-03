import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const correctionId = Number(id);
  const body = await req.json();
  const { status, operatorId } = body;

  if (!["pending", "approved", "rejected"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.correction.findUnique({ where: { id: correctionId } });
  if (!existing) return Response.json({ error: "纠偏记录不存在" }, { status: 404 });

  try {
    // RC6: wrap correction update + report update in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const correction = await tx.correction.update({
        where: { id: correctionId },
        data: { status },
      });

      if (status === "approved" && correction.reportId) {
        try {
          const parsed = JSON.parse(correction.corrected) as {
            task?: string;
            spec?: string;
            qty?: string;
          };
          const updateData: { task?: string; spec?: string; qty?: string } = {};
          if (parsed.task) updateData.task = parsed.task;
          if (parsed.spec) updateData.spec = parsed.spec;
          if (parsed.qty) updateData.qty = parsed.qty;
          if (Object.keys(updateData).length > 0) {
            await tx.report.update({
              where: { id: correction.reportId },
              data: updateData,
            });
          }
        } catch {
          // corrected is plain text (legacy) — no report fields to apply
        }
      }

      return correction;
    });

    await writeAudit({
      tableName: "Correction",
      recordId: correctionId,
      field: "status",
      oldValue: existing.status,
      newValue: status,
      operatorId: operatorId ?? "admin",
      action: "update",
    });

    return Response.json(result);
  } catch (e) {
    console.error("correction PATCH error:", e);
    return Response.json({ error: "更新失败，请稍后重试" }, { status: 500 });
  }
}
