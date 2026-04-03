import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const libs = await prisma.priceLibrary.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return Response.json(libs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, projectCode } = body;
  if (!name || !type) return Response.json({ error: "name and type required" }, { status: 400 });
  const lib = await prisma.priceLibrary.create({
    data: { name, type, projectCode: projectCode ?? null },
  });
  return Response.json(lib, { status: 201 });
}
