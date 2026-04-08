import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const project = searchParams.get("project") || undefined;
  const pageStr = searchParams.get("page") || "1";
  const limitStr = searchParams.get("limit") || "20";
  const page = Math.max(1, parseInt(pageStr));
  const limit = Math.min(100, Math.max(1, parseInt(limitStr)));

  const where = {
    ...(type && { type }),
    ...(status && { status }),
    ...(project && { projectName: { contains: project } }),
  };

  const [total, tickets] = await Promise.all([
    prisma.workTicket.count({ where }),
    prisma.workTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return Response.json({ total, page, limit, tickets });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ticketNo, type, projectName, projectCode, workTeam, riskLevel,
      workContent, workLocation, workerCount, plannedStart, plannedEnd,
      foreman, supervisor, assignments, risks, preconditions, preControls,
      note, status,
    } = body;

    if (!type || !projectName || !workTeam || !workContent || !workLocation || !foreman) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const ticket = await prisma.workTicket.create({
      data: {
        ticketNo: ticketNo || null,
        type,
        projectName,
        projectCode: projectCode || null,
        workTeam,
        riskLevel: riskLevel || "四级",
        workContent,
        workLocation,
        workerCount: workerCount ? Number(workerCount) : 1,
        plannedStart: plannedStart ? new Date(plannedStart) : null,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
        foreman,
        supervisor: supervisor || null,
        assignments: assignments || null,
        risks: risks || null,
        preconditions: preconditions ?? undefined,
        preControls: preControls ?? undefined,
        note: note || null,
        status: status || "draft",
      },
    });

    return Response.json(ticket, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: `创建失败：${msg}` }, { status: 500 });
  }
}
