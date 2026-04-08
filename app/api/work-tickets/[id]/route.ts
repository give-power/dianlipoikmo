import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticket = await prisma.workTicket.findUnique({ where: { id: Number(id) } });
  if (!ticket) return Response.json({ error: "作业票不存在" }, { status: 404 });
  return Response.json(ticket);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const {
      ticketNo, type, projectName, projectCode, workTeam, riskLevel,
      workContent, workLocation, workerCount, plannedStart, plannedEnd,
      actualStart, actualEnd, foreman, supervisor, assignments,
      memberChanges, risks, preconditions, preControls, fieldChanges,
      signerForeman, signerApprover, signerPermitter,
      permitTime, permitMethod, endTime, note, status,
    } = body;

    const ticket = await prisma.workTicket.update({
      where: { id: Number(id) },
      data: {
        ...(ticketNo !== undefined && { ticketNo: ticketNo || null }),
        ...(type !== undefined && { type }),
        ...(projectName !== undefined && { projectName }),
        ...(projectCode !== undefined && { projectCode: projectCode || null }),
        ...(workTeam !== undefined && { workTeam }),
        ...(riskLevel !== undefined && { riskLevel }),
        ...(workContent !== undefined && { workContent }),
        ...(workLocation !== undefined && { workLocation }),
        ...(workerCount !== undefined && { workerCount: Number(workerCount) }),
        ...(plannedStart !== undefined && { plannedStart: plannedStart ? new Date(plannedStart) : null }),
        ...(plannedEnd !== undefined && { plannedEnd: plannedEnd ? new Date(plannedEnd) : null }),
        ...(actualStart !== undefined && { actualStart: actualStart ? new Date(actualStart) : null }),
        ...(actualEnd !== undefined && { actualEnd: actualEnd ? new Date(actualEnd) : null }),
        ...(foreman !== undefined && { foreman }),
        ...(supervisor !== undefined && { supervisor: supervisor || null }),
        ...(assignments !== undefined && { assignments: assignments || null }),
        ...(memberChanges !== undefined && { memberChanges: memberChanges || null }),
        ...(risks !== undefined && { risks: risks || null }),
        ...(preconditions !== undefined && { preconditions }),
        ...(preControls !== undefined && { preControls }),
        ...(fieldChanges !== undefined && { fieldChanges: fieldChanges || null }),
        ...(signerForeman !== undefined && { signerForeman: signerForeman || null }),
        ...(signerApprover !== undefined && { signerApprover: signerApprover || null }),
        ...(signerPermitter !== undefined && { signerPermitter: signerPermitter || null }),
        ...(permitTime !== undefined && { permitTime: permitTime ? new Date(permitTime) : null }),
        ...(permitMethod !== undefined && { permitMethod: permitMethod || null }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(note !== undefined && { note: note || null }),
        ...(status !== undefined && { status }),
      },
    });
    return Response.json(ticket);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: `更新失败：${msg}` }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.workTicket.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("work ticket delete error:", e);
    return Response.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
