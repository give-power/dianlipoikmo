import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const libraryId = searchParams.get("libraryId");
  const query = searchParams.get("q");       // keyword search
  const project = searchParams.get("project"); // auto-match by project

  const where: Record<string, unknown> = {};
  if (libraryId) where.libraryId = Number(libraryId);
  if (project) {
    where.library = { OR: [{ projectCode: project }, { projectCode: null }], isActive: true };
  }
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { code: { contains: query, mode: "insensitive" } },
      { keywords: { has: query } },
    ];
  }

  const items = await prisma.priceItem.findMany({
    where,
    include: { library: { select: { name: true } } },
    orderBy: { code: "asc" },
    take: 50,
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { libraryId, code, name, unit, unitPrice, spec, keywords } = body;
  if (!libraryId || !code || !name || !unit || unitPrice === undefined) {
    return Response.json({ error: "libraryId, code, name, unit, unitPrice required" }, { status: 400 });
  }
  const item = await prisma.priceItem.create({
    data: {
      libraryId: Number(libraryId),
      code,
      name,
      unit,
      unitPrice: Number(unitPrice),
      spec: spec ?? null,
      keywords: Array.isArray(keywords) ? keywords : [],
    },
  });
  return Response.json(item, { status: 201 });
}
