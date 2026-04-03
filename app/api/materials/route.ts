import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectCode = searchParams.get("project");
  const libraryId = searchParams.get("libraryId");

  const where: Record<string, unknown> = {};
  if (libraryId) where.libraryId = Number(libraryId);
  if (projectCode) {
    where.library = { projectCode };
  }

  const items = await prisma.material.findMany({
    where,
    include: { library: { select: { name: true, projectCode: true } } },
    orderBy: { code: "asc" },
  });

  return Response.json(items);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, usedQty } = body;
  if (!id || usedQty === undefined) {
    return Response.json({ error: "id and usedQty required" }, { status: 400 });
  }
  const item = await prisma.material.update({
    where: { id: Number(id) },
    data: { usedQty: Number(usedQty) },
  });
  return Response.json(item);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { libraryId, code, name, unit, planQty, unitCost } = body;
  if (!libraryId || !code || !name || !unit) {
    return Response.json({ error: "libraryId, code, name, unit required" }, { status: 400 });
  }
  const item = await prisma.material.create({
    data: {
      libraryId: Number(libraryId),
      code,
      name,
      unit,
      planQty: planQty ? Number(planQty) : 0,
      usedQty: 0,
      unitCost: unitCost ? Number(unitCost) : 0,
    },
  });
  return Response.json(item, { status: 201 });
}
