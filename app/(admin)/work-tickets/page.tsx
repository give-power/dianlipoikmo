"use client";
import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkTicket {
  id: number;
  ticketNo?: string;
  type: string;
  projectName: string;
  projectCode?: string;
  workTeam: string;
  riskLevel: string;
  workContent: string;
  workLocation: string;
  workerCount: number;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  foreman: string;
  supervisor?: string;
  assignments?: string;
  risks?: string;
  note?: string;
  status: string;
  createdAt: string;
}

interface TicketTypeConfig {
  id: number;
  code: string;
  name: string;
  color: string;
  bgColor: string;
  defaultRisks?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  draft:  { label: "草稿",   bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  active: { label: "作业中", bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  closed: { label: "已结票", bg: "rgba(59,130,246,0.12)",  color: "#60a5fa" },
};

const RISK_LEVELS = ["一级", "二级", "三级", "四级"];

const BUILTIN_TYPES: Record<string, { name: string; color: string; bgColor: string }> = {
  electrical: { name: "电气施工作业票", color: "#34d399", bgColor: "rgba(52,211,153,0.12)" },
  civil:      { name: "土建施工作业票", color: "#fb923c", bgColor: "rgba(251,146,60,0.12)"  },
};

function getTypeStyle(code: string, types: TicketTypeConfig[]) {
  const found = types.find((t) => t.code === code);
  if (found) return { name: found.name, color: found.color, bgColor: found.bgColor };
  return BUILTIN_TYPES[code] ?? { name: code, color: "#9ca3af", bgColor: "rgba(100,100,100,0.12)" };
}

function fmtDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Empty form state ────────────────────────────────────────────────────────

function emptyForm(defaultType: string) {
  return {
    ticketNo: "",
    type: defaultType,
    projectName: "",
    projectCode: "",
    workTeam: "",
    riskLevel: "四级",
    workContent: "",
    workLocation: "",
    workerCount: "1",
    plannedStart: "",
    plannedEnd: "",
    foreman: "",
    supervisor: "",
    assignments: "",
    risks: "",
    note: "",
  };
}

// ─── Drawer Form ─────────────────────────────────────────────────────────────

function TicketDrawer({
  ticketTypes,
  editing,
  onSuccess,
  onClose,
}: {
  ticketTypes: TicketTypeConfig[];
  editing: WorkTicket | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const defaultType = ticketTypes[0]?.code ?? "electrical";
  const [form, setForm] = useState(() =>
    editing
      ? {
          ticketNo:    editing.ticketNo ?? "",
          type:        editing.type,
          projectName: editing.projectName,
          projectCode: editing.projectCode ?? "",
          workTeam:    editing.workTeam,
          riskLevel:   editing.riskLevel,
          workContent: editing.workContent,
          workLocation: editing.workLocation,
          workerCount: String(editing.workerCount),
          plannedStart: editing.plannedStart ? editing.plannedStart.slice(0, 10) : "",
          plannedEnd:   editing.plannedEnd   ? editing.plannedEnd.slice(0, 10)   : "",
          foreman:    editing.foreman,
          supervisor: editing.supervisor ?? "",
          assignments: editing.assignments ?? "",
          risks:      editing.risks ?? "",
          note:       editing.note ?? "",
        }
      : emptyForm(defaultType)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Auto-fill default risks when type changes
  useEffect(() => {
    if (!editing) {
      const t = ticketTypes.find((t) => t.code === form.type);
      if (t?.defaultRisks && !form.risks) {
        setForm((f) => ({ ...f, risks: t.defaultRisks ?? "" }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleOcr = async (file: File) => {
    setOcrLoading(true); setOcrError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type || "image/jpeg", docType: "work-ticket" }),
      });
      const data = await r.json();
      if (!r.ok || data.error) { setOcrError(data.error ?? "识别失败"); return; }
      const f = data.fields ?? {};
      setForm((prev) => ({
        ...prev,
        ...(f.ticketNo     ? { ticketNo:     f.ticketNo }               : {}),
        ...(f.projectName  ? { projectName:  f.projectName }            : {}),
        ...(f.projectCode  ? { projectCode:  f.projectCode }            : {}),
        ...(f.workTeam     ? { workTeam:     f.workTeam }               : {}),
        ...(f.workContent  ? { workContent:  f.workContent }            : {}),
        ...(f.workLocation ? { workLocation: f.workLocation }           : {}),
        ...(f.workerCount  ? { workerCount:  String(f.workerCount) }    : {}),
        ...(f.foreman      ? { foreman:      f.foreman }                : {}),
        ...(f.supervisor   ? { supervisor:   f.supervisor }             : {}),
        ...(f.risks        ? { risks:        f.risks }                  : {}),
        ...(f.riskLevel && ["一级","二级","三级","四级"].includes(f.riskLevel) ? { riskLevel: f.riskLevel } : {}),
        ...(f.plannedStart ? { plannedStart: f.plannedStart }           : {}),
        ...(f.plannedEnd   ? { plannedEnd:   f.plannedEnd }             : {}),
      }));
    } catch { setOcrError("识别出错，请重试"); }
    finally { setOcrLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.projectName.trim() || !form.workTeam.trim() || !form.workContent.trim() || !form.workLocation.trim() || !form.foreman.trim()) {
      setError("项目名、班组、作业内容、作业地点、负责人均为必填");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ticketNo:    form.ticketNo.trim() || null,
        type:        form.type,
        projectName: form.projectName.trim(),
        projectCode: form.projectCode.trim() || null,
        workTeam:    form.workTeam.trim(),
        riskLevel:   form.riskLevel,
        workContent: form.workContent.trim(),
        workLocation: form.workLocation.trim(),
        workerCount: Number(form.workerCount) || 1,
        plannedStart: form.plannedStart || null,
        plannedEnd:   form.plannedEnd   || null,
        foreman:    form.foreman.trim(),
        supervisor: form.supervisor.trim() || null,
        assignments: form.assignments.trim() || null,
        risks:      form.risks.trim() || null,
        note:       form.note.trim() || null,
      };
      const url    = editing ? `/api/work-tickets/${editing.id}` : "/api/work-tickets";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? `操作失败（HTTP ${res.status}）`);
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="h-full w-[480px] flex flex-col overflow-hidden"
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="font-semibold text-white">{editing ? "编辑作业票" : "新建作业票"}</span>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: "var(--muted)" }}>×</button>
        </div>

        {/* OCR Upload */}
        <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" disabled={ocrLoading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOcr(f); e.target.value = ""; }} />
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all select-none"
              style={{ background: "rgba(59,130,246,0.06)", border: "1px dashed rgba(59,130,246,0.35)" }}>
              {ocrLoading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                    style={{ borderColor: "rgba(59,130,246,0.3)", borderTopColor: "var(--accent)" }} />
                  <span className="text-xs" style={{ color: "var(--accent)" }}>AI识别中...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs" style={{ color: "var(--accent)" }}>拍照 / 上传图片自动识别</span>
                </>
              )}
            </div>
            {ocrError && <span className="text-xs" style={{ color: "#f87171" }}>{ocrError}</span>}
            {!ocrLoading && !ocrError && <span className="text-xs" style={{ color: "var(--muted)" }}>支持纸质作业票拍照</span>}
          </label>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--muted)" }}>作业票类型</label>
            <div className="flex gap-2 flex-wrap">
              {(ticketTypes.length > 0 ? ticketTypes : [
                { code: "electrical", name: "电气施工作业票" },
                { code: "civil",      name: "土建施工作业票" },
              ] as { code: string; name: string }[]).map((t) => (
                <button
                  key={t.code}
                  onClick={() => set("type", t.code)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: form.type === t.code ? "var(--accent)" : "var(--bg)",
                    color: form.type === t.code ? "#fff" : "var(--muted)",
                    border: `1px solid ${form.type === t.code ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>票号</label>
              <input value={form.ticketNo} onChange={(e) => set("ticketNo", e.target.value)}
                placeholder="自动生成或手填" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>风险等级</label>
              <select value={form.riskLevel} onChange={(e) => set("riskLevel", e.target.value)} className="input-field w-full">
                {RISK_LEVELS.map((r) => <option key={r} value={r} style={{ background: "#0d1929" }}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>所属项目 *</label>
              <input value={form.projectName} onChange={(e) => set("projectName", e.target.value)}
                placeholder="输入项目名称" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>项目编号</label>
              <input value={form.projectCode} onChange={(e) => set("projectCode", e.target.value)}
                placeholder="选填" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>作业班组 *</label>
              <input value={form.workTeam} onChange={(e) => set("workTeam", e.target.value)}
                placeholder="例：一班" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>负责人 *</label>
              <input value={form.foreman} onChange={(e) => set("foreman", e.target.value)}
                placeholder="班组长姓名" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>监护人</label>
              <input value={form.supervisor} onChange={(e) => set("supervisor", e.target.value)}
                placeholder="选填" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>作业人数</label>
              <input value={form.workerCount} onChange={(e) => set("workerCount", e.target.value)}
                type="number" min="1" className="input-field w-full" />
            </div>
          </div>

          {/* Location & content */}
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>作业地点 *</label>
              <input value={form.workLocation} onChange={(e) => set("workLocation", e.target.value)}
                placeholder="例：中埔社10016-10配电站" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>作业内容 *</label>
              <textarea value={form.workContent} onChange={(e) => set("workContent", e.target.value)}
                placeholder="详细描述本次施工作业内容..."
                rows={3} className="input-field w-full resize-none" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>计划开始</label>
              <input value={form.plannedStart} onChange={(e) => set("plannedStart", e.target.value)}
                type="date" className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>计划结束</label>
              <input value={form.plannedEnd} onChange={(e) => set("plannedEnd", e.target.value)}
                type="date" className="input-field w-full" />
            </div>
          </div>

          {/* Assignments */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>人员分工</label>
            <textarea value={form.assignments} onChange={(e) => set("assignments", e.target.value)}
              placeholder="各成员分工安排..."
              rows={2} className="input-field w-full resize-none" />
          </div>

          {/* Risks */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>风险点（每行一条）</label>
            <textarea value={form.risks} onChange={(e) => set("risks", e.target.value)}
              placeholder="列举本次作业的风险点..."
              rows={4} className="input-field w-full resize-none font-mono text-xs" />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>备注</label>
            <textarea value={form.note} onChange={(e) => set("note", e.target.value)}
              rows={2} className="input-field w-full resize-none" />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 shrink-0" style={{ borderColor: "var(--border)" }}>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-2 disabled:opacity-50">
            {submitting ? "提交中..." : editing ? "保存修改" : "创建作业票"}
          </button>
          <button onClick={onClose} className="btn-ghost px-4 py-2">取消</button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Row ───────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  ticketTypes,
  onEdit,
  onStatusChange,
}: {
  ticket: WorkTicket;
  ticketTypes: TicketTypeConfig[];
  onEdit: (t: WorkTicket) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  const s = STATUS_MAP[ticket.status] ?? STATUS_MAP.draft;
  const tp = getTypeStyle(ticket.type, ticketTypes);

  return (
    <div
      className="glass rounded-xl px-5 py-4"
      style={{ borderLeft: `2px solid ${ticket.status === "active" ? tp.color : "var(--border)"}` }}
    >
      <div className="flex items-start gap-4">
        {/* Left: meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {ticket.ticketNo && (
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{ticket.ticketNo}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: tp.bgColor, color: tp.color }}>
              {tp.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: s.bg, color: s.color }}>
              {s.label}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
              {ticket.riskLevel}
            </span>
          </div>

          <p className="text-sm text-white mb-1 leading-snug line-clamp-2">{ticket.workContent}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1.5" style={{ color: "var(--muted)" }}>
            <span>{ticket.projectName}</span>
            <span>{ticket.workLocation}</span>
            <span>{ticket.workTeam} · {ticket.workerCount}人</span>
            <span>负责人：{ticket.foreman}</span>
            {ticket.plannedStart && (
              <span>{fmtDate(ticket.plannedStart)} → {fmtDate(ticket.plannedEnd)}</span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={() => onEdit(ticket)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            编辑
          </button>
          {ticket.status === "draft" && (
            <button
              onClick={() => onStatusChange(ticket.id, "active")}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              开票
            </button>
          )}
          {ticket.status === "active" && (
            <button
              onClick={() => onStatusChange(ticket.id, "closed")}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}
            >
              结票
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkTicketsPage() {
  const [tickets, setTickets] = useState<WorkTicket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<WorkTicket | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const data = await fetch(`/api/work-tickets?${params}`).then((r) => r.json());
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetch("/api/work-ticket-types")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTicketTypes(d); })
      .catch(() => {});
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    await fetch(`/api/work-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(console.error);
  };

  const openNew = () => { setEditing(null); setShowDrawer(true); };
  const openEdit = (t: WorkTicket) => { setEditing(t); setShowDrawer(true); };

  const active = tickets.filter((t) => t.status === "active").length;
  const draft  = tickets.filter((t) => t.status === "draft").length;

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">施工作业票</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "加载中..." : `${active} 张作业中 · ${draft} 张草稿 · 共 ${tickets.length} 张`}
          </p>
        </div>
        <button className="btn-primary text-sm px-4 py-2" onClick={openNew}>+ 新建作业票</button>
      </div>

      <div className="px-8 py-6 space-y-4">
        {/* Filters */}
        {!loading && (
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="all">全部类型</option>
              {(ticketTypes.length > 0 ? ticketTypes : [
                { code: "electrical", name: "电气施工作业票" },
                { code: "civil",      name: "土建施工作业票" },
              ]).map((t) => (
                <option key={t.code} value={t.code} style={{ background: "#0d1929" }}>{t.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="all">全部状态</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k} style={{ background: "#0d1929" }}>{v.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        )}

        {/* Empty */}
        {!loading && tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无作业票记录</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>点击右上角新建作业票</span>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              ticketTypes={ticketTypes}
              onEdit={openEdit}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      </div>

      {/* Drawer */}
      {showDrawer && (
        <TicketDrawer
          ticketTypes={ticketTypes}
          editing={editing}
          onSuccess={() => { setShowDrawer(false); fetchAll(); }}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}
