import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// ─── Tool definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "query_checkins",
      description: "查询打卡签到记录。可按日期（today/yesterday/all）和项目过滤。",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            enum: ["today", "yesterday", "all"],
            description: "查询范围，默认 today",
          },
          project: { type: "string", description: "项目名称，不传则查全部" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_reports",
      description: "查询施工报量记录。可按日期范围、项目、工人姓名、状态过滤。",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", enum: ["today", "yesterday", "all"], description: "默认 all" },
          project: { type: "string", description: "项目名称" },
          workerName: { type: "string", description: "工人姓名" },
          status: {
            type: "string",
            enum: ["pending", "confirmed", "all"],
            description: "报量状态，默认 all",
          },
          limit: { type: "number", description: "最多返回条数，默认 20" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_visas",
      description: "查询签证申请列表，可按状态过滤，并统计金额。",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected", "all"],
            description: "默认 all",
          },
          project: { type: "string", description: "项目名称" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_visa",
      description: "批准一条签证申请（将状态改为 approved）。",
      parameters: {
        type: "object",
        required: ["visaId"],
        properties: {
          visaId: { type: "number", description: "签证 ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_visa",
      description: "驳回一条签证申请（将状态改为 rejected）。",
      parameters: {
        type: "object",
        required: ["visaId"],
        properties: {
          visaId: { type: "number", description: "签证 ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_corrections",
      description: "查询异常纠偏申请，可按状态过滤。",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected", "all"],
            description: "默认 all",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_correction",
      description: "处理（批准或驳回）一条纠偏申请。",
      parameters: {
        type: "object",
        required: ["correctionId", "action"],
        properties: {
          correctionId: { type: "number", description: "纠偏记录 ID" },
          action: {
            type: "string",
            enum: ["approve", "reject"],
            description: "approve = 批准，reject = 驳回",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_projects",
      description: "查询在施项目列表，含预算、进度、利润率等数据。",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "pending", "completed", "all"],
            description: "默认 all",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "更新项目状态（active/pending/completed）。",
      parameters: {
        type: "object",
        required: ["projectCode", "status"],
        properties: {
          projectCode: { type: "string", description: "项目编号 code" },
          status: {
            type: "string",
            enum: ["active", "pending", "completed"],
            description: "新状态",
          },
        },
      },
    },
  },
];

// ─── Tool executor ──────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const yesterdayUTC = new Date(todayUTC.getTime() - 86400_000);

  const dateFilter = (date?: string) => {
    if (date === "today") return { gte: todayUTC };
    if (date === "yesterday") return { gte: yesterdayUTC, lt: todayUTC };
    return undefined;
  };

  switch (name) {
    case "query_checkins": {
      const df = dateFilter((args.date as string) ?? "today");
      const where: Record<string, unknown> = {};
      if (df) where.createdAt = df;
      if (args.project) where.project = args.project;

      const rows = await prisma.checkIn.findMany({
        where,
        include: { worker: true },
        orderBy: { createdAt: "desc" },
      });

      if (!rows.length) return "暂无打卡记录";

      const byProject: Record<string, string[]> = {};
      rows.forEach((ci) => {
        if (!byProject[ci.project]) byProject[ci.project] = [];
        byProject[ci.project].push(`${ci.worker.name}（${ci.createdAt.toLocaleTimeString("zh-CN")}）`);
      });

      return `共 ${rows.length} 条打卡记录：\n` +
        Object.entries(byProject)
          .map(([p, names]) => `【${p}】${names.join("、")}`)
          .join("\n");
    }

    case "query_reports": {
      const df = dateFilter(args.date as string);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};
      if (df) where.createdAt = df;
      if (args.project) where.project = args.project;
      if (args.workerName) where.workerName = { contains: args.workerName as string };
      if (args.status && args.status !== "all") where.status = args.status;

      const rows = await prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: (args.limit as number) ?? 20,
      });

      if (!rows.length) return "暂无报量记录";
      return `共 ${rows.length} 条报量：\n` +
        rows.map((r) =>
          `[${r.id}] ${r.workerName} · ${r.project} · ${r.task} ${r.spec} ${r.qty} · 状态:${r.status}`
        ).join("\n");
    }

    case "query_visas": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};
      if (args.status && args.status !== "all") where.status = args.status;
      if (args.project) where.project = args.project;

      const rows = await prisma.visa.findMany({ where, orderBy: { createdAt: "desc" } });
      if (!rows.length) return "暂无签证记录";

      const total = rows.reduce((s, v) => s + v.amount, 0);
      return `共 ${rows.length} 条签证，合计 ¥${total.toLocaleString()}：\n` +
        rows.map((v) =>
          `[ID:${v.id}] ${v.title} · ¥${v.amount.toLocaleString()} · ${v.submitter} · ${v.project} · 状态:${v.status}`
        ).join("\n");
    }

    case "approve_visa": {
      const visa = await prisma.visa.update({
        where: { id: args.visaId as number },
        data: { status: "approved", updatedAt: new Date() },
      });
      return `签证 [ID:${visa.id}]「${visa.title}」已批准，金额 ¥${visa.amount.toLocaleString()}`;
    }

    case "reject_visa": {
      const visa = await prisma.visa.update({
        where: { id: args.visaId as number },
        data: { status: "rejected", updatedAt: new Date() },
      });
      return `签证 [ID:${visa.id}]「${visa.title}」已驳回`;
    }

    case "query_corrections": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};
      if (args.status && args.status !== "all") where.status = args.status;

      const rows = await prisma.correction.findMany({ where, orderBy: { createdAt: "desc" } });
      if (!rows.length) return "暂无纠偏记录";

      return `共 ${rows.length} 条纠偏：\n` +
        rows.map((c) =>
          `[ID:${c.id}] ${c.workerName} · 原:${c.original} → 改:${c.corrected} · 原因:${c.reason} · 状态:${c.status}`
        ).join("\n");
    }

    case "resolve_correction": {
      const newStatus = args.action === "approve" ? "approved" : "rejected";
      const cor = await prisma.correction.update({
        where: { id: args.correctionId as number },
        data: { status: newStatus, updatedAt: new Date() },
      });
      const label = args.action === "approve" ? "已批准" : "已驳回";
      return `纠偏 [ID:${cor.id}]（${cor.workerName}：${cor.original}→${cor.corrected}）${label}`;
    }

    case "query_projects": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {};
      if (args.status && args.status !== "all") where.status = args.status;

      const rows = await prisma.project.findMany({ where, orderBy: { createdAt: "asc" } });
      if (!rows.length) return "暂无项目数据";

      return rows.map((p) => {
        const pct = p.budget > 0 ? ((p.spent / p.budget) * 100).toFixed(1) : "—";
        const budgetW = (p.budget / 10000).toFixed(1);
        const spentW = (p.spent / 10000).toFixed(1);
        return `[${p.code}] ${p.name} · 预算¥${budgetW}万 · 已用¥${spentW}万(${pct}%) · 利润率${p.profitRate}% · ${p.status}`;
      }).join("\n");
    }

    case "update_project_status": {
      const proj = await prisma.project.update({
        where: { code: args.projectCode as string },
        data: { status: args.status as string },
      });
      return `项目「${proj.name}」状态已更新为 ${proj.status}`;
    }

    default:
      return `未知工具：${name}`;
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是 PowerLink OS 智能工程管理 Agent，面向配电施工项目的班组长和管理员。

你拥有以下能力（通过工具调用实现）：
- 查询今日/历史打卡记录
- 查询施工报量，按项目/工人/状态过滤
- 查询、批准、驳回签证申请
- 查询、处理异常纠偏申请
- 查询项目概况、预算进度、利润率
- 更新项目状态

行为准则：
- 每次回答前优先调用相关工具获取真实数据，不要凭空捏造数字
- 执行写操作（批准/驳回/更新）前，先确认用户意图明确
- 回答简洁直接，用中文，金额统一用人民币（¥）
- 如果用户问的问题超出工具范围，如实说明`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // 转换前端消息格式
    const apiMessages: Record<string, unknown>[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role === "agent" ? "assistant" : "user",
        content: m.text,
      })),
    ];

    const VOLC_URL = `${process.env.VOLC_BASE_URL}/chat/completions`;

    // ── Tool calling loop（最多 4 轮）──
    let rounds = 0;
    while (rounds < 4) {
      rounds++;

      const res = await fetch(VOLC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VOLC_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.VOLC_MODEL,
          messages: apiMessages,
          tools: TOOLS,
          tool_choice: "auto",
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Volcengine error:", err);
        return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;

      if (!msg) {
        return NextResponse.json({ error: "AI 返回格式异常" }, { status: 502 });
      }

      // 如果 AI 要调用工具
      if (choice.finish_reason === "tool_calls" && Array.isArray(msg.tool_calls)) {
        // 把 assistant 的 tool_calls 消息追加进去
        apiMessages.push({
          role: "assistant",
          content: msg.content ?? null,
          tool_calls: msg.tool_calls,
        });

        // 并行执行所有 tool calls
        const toolResults = await Promise.all(
          msg.tool_calls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              // ignore parse error
            }
            console.log(`[Agent] tool_call: ${tc.function.name}`, args);
            const result = await executeTool(tc.function.name, args);
            return {
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            };
          })
        );

        // 把工具结果追加进消息列表，继续下一轮
        apiMessages.push(...toolResults);
        continue;
      }

      // AI 给出最终文本回答
      const text =
        msg.content ??
        msg.reasoning_content ??
        "（无法获取回答，请稍后重试）";

      return NextResponse.json({ text });
    }

    return NextResponse.json({ text: "（已达到最大工具调用轮次，请重新提问）" });
  } catch (e) {
    console.error("/api/agent error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
