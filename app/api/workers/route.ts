import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  return Response.json(workers);
}

export async function POST(req: NextRequest) {
  const { name, project, phone } = await req.json();
  if (!name || !project) {
    return Response.json({ error: "name and project required" }, { status: 400 });
  }
  // Generate a short ID: W + timestamp suffix
  const id = "W" + Date.now().toString(36).toUpperCase();
  const worker = await prisma.worker.create({
    data: { id, name, project, phone: phone ?? null },
  });
  return Response.json(worker);
}
