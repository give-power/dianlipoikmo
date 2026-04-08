import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const types = await prisma.visaTypeConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(types);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, color, bgColor, fieldSchema, sortOrder } = body;
    if (!code || !name) {
      return Response.json({ error: "code 和 name 不能为空" }, { status: 400 });
    }
    const type = await prisma.visaTypeConfig.create({
      data: {
        code,
        name,
        color: color || "#60a5fa",
        bgColor: bgColor || "rgba(59,130,246,0.12)",
        fieldSchema: fieldSchema ?? undefined,
        sortOrder: sortOrder ?? 0,
      },
    });
    return Response.json(type, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: `创建失败：${msg}` }, { status: 500 });
  }
}
