import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const visaId = Number(id);
  const body = await req.json();
  const { status, operatorId } = body;

  if (!["pending", "approved", "rejected"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.visa.findUnique({ where: { id: visaId } });
  if (!existing) return Response.json({ error: "签证不存在" }, { status: 404 });

  const visa = await prisma.visa.update({
    where: { id: visaId },
    data: { status },
  });

  await writeAudit({
    tableName: "Visa",
    recordId: visaId,
    field: "status",
    oldValue: existing.status,
    newValue: status,
    operatorId: operatorId ?? "admin",
    action: "update",
  });

  return Response.json(visa);
}
