import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const libs = await prisma.materialLibrary.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return Response.json(libs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, projectCode } = body;
  if (!name) return Response.json({ error: "name required" }, { status: 400 });
  const lib = await prisma.materialLibrary.create({
    data: { name, projectCode: projectCode ?? null },
  });
  return Response.json(lib, { status: 201 });
}
