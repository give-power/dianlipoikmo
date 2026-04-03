import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

function computeStatus(nextCheckDate: Date | null): string {
  if (!nextCheckDate) return "normal";
  const now = new Date();
  const diff = Math.floor((nextCheckDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 15) return "warning";
  return "normal";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "warning" | "overdue" | null

  const items = await prisma.equipment.findMany({
    orderBy: { nextCheckDate: "asc" },
  });

  // recompute dynamic status and persist if changed
  const updates: Promise<unknown>[] = [];
  const result = items.map((eq) => {
    const computed = computeStatus(eq.nextCheckDate);
    if (computed !== eq.status) {
      updates.push(prisma.equipment.update({ where: { id: eq.id }, data: { status: computed } }));
    }
    return { ...eq, status: computed };
  });
  await Promise.all(updates);

  const alert = searchParams.get("alert");
  if (alert) return Response.json(result.filter((e) => e.status === "warning" || e.status === "overdue"));
  if (status) return Response.json(result.filter((e) => e.status === status));
  return Response.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, code, projectCode, lastCheckDate, nextCheckDate, note } = body;
  if (!name) return Response.json({ error: "name required" }, { status: 400 });

  const eq = await prisma.equipment.create({
    data: {
      name,
      code: code ?? null,
      projectCode: projectCode ?? null,
      lastCheckDate: lastCheckDate ? new Date(lastCheckDate) : null,
      nextCheckDate: nextCheckDate ? new Date(nextCheckDate) : null,
      status: computeStatus(nextCheckDate ? new Date(nextCheckDate) : null),
      note: note ?? null,
    },
  });

  await writeAudit({
    tableName: "Equipment",
    recordId: eq.id,
    field: "status",
    oldValue: null,
    newValue: eq.status,
    operatorId: body.operatorId ?? "admin",
    action: "create",
  });

  return Response.json(eq, { status: 201 });
}
