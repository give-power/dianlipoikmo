"use client";
import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VisaItem {
  desc: string;
  qty: string;
  unit: string;
  unitPrice: string;
}

interface Visa {
  id: number;
  serialNo?: string;
  type: "quantity" | "period";
  title: string;
  amount: number;
  submitter: string;
  project: string;
  reason?: string;
  items?: VisaItem[];
  daysExtended?: number;
  periodReason?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_MAP = {
  pending:  { label: "待批复", bg: "rgba(245,158,11,0.12)",  color: "var(--amber, #f59e0b)" },
  approved: { label: "已批复", bg: "rgba(16,185,129,0.12)",  color: "var(--green, #10b981)" },
  rejected: { label: "已驳回", bg: "rgba(239,68,68,0.1)",    color: "#ef4444" },
};

const TYPE_MAP = {
  quantity: { label: "工程量签证", bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  period:   { label: "工期签证",   bg: "rgba(168,85,247,0.12)", color: "#c084fc" },
};

function calcItemTotal(item: VisaItem) {
  const q = parseFloat(item.qty) || 0;
  const p = parseFloat(item.unitPrice) || 0;
  return q * p;
}

const EMPTY_ITEM: VisaItem = { desc: "", qty: "", unit: "", unitPrice: "" };

const EMPTY_FORM = {
  type: "quantity" as "quantity" | "period",
  title: "",
  submitter: "",
  project: "",
  serialNo: "",
  reason: "",
  // quantity
  amount: "",
  items: [{ ...EMPTY_ITEM }] as VisaItem[],
  // period
  daysExtended: "",
  periodReason: "",
};

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreateForm({
  projects,
  onSuccess,
  onCancel,
}: {
  projects: Project[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    project: projects[0]?.name ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleItemChange = (idx: number, k: keyof VisaItem, v: string) => {
    const items = form.items.map((item, i) => i === idx ? { ...item, [k]: v } : item);
    set("items", items);
  };

  const computedAmount = form.type === "quantity"
    ? form.items.reduce((s, it) => s + calcItemTotal(it), 0)
    : 0;

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.submitter.trim() || !form.project.trim()) {
      setError("标题、提交人、项目均为必填");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title.trim(),
        submitter: form.submitter.trim(),
        project: form.project.trim(),
        serialNo: form.serialNo.trim() || null,
        reason: form.reason.trim() || null,
      };
      if (form.type === "quantity") {
        const cleanItems = form.items.filter((it) => it.desc.trim());
        payload.items = cleanItems.length > 0 ? cleanItems : null;
        payload.amount = computedAmount || (form.amount ? Number(form.amount) : 0);
      } else {
        payload.daysExtended = form.daysExtended ? Number(form.daysExtended) : null;
        payload.periodReason = form.periodReason.trim() || null;
        payload.amount = 0;
      }
      const res = await fetch("/api/visas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? `创建失败（HTTP ${res.status}）`);
      }
    } catch {
      setError("网络错误，请检查连接后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-xl p-5 mb-2" style={{ borderLeft: "2px solid var(--accent)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-white">发起签证</div>
        {/* 类型切换 */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          {(["quantity", "period"] as const).map((t) => (
            <button
              key={t}
              onClick={() => set("type", t)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: form.type === t ? "var(--accent)" : "var(--bg)",
                color: form.type === t ? "#fff" : "var(--muted)",
              }}
            >
              {TYPE_MAP[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Common fields */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>签证标题 *</label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={form.type === "quantity" ? "例：中埔社空中缆线整治-增量签证" : "例：叶厝社区强电整治-工期延期申请"}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>序号</label>
          <input
            value={form.serialNo}
            onChange={(e) => set("serialNo", e.target.value)}
            placeholder="例：TJ-002"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>提交人 *</label>
          <input
            value={form.submitter}
            onChange={(e) => set("submitter", e.target.value)}
            placeholder="例：张三"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>所属项目 *</label>
          {projects.length > 0 ? (
            <select
              value={form.project}
              onChange={(e) => set("project", e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.name} style={{ background: "#0d1929" }}>{p.name}</option>
              ))}
            </select>
          ) : (
            <input
              value={form.project}
              onChange={(e) => set("project", e.target.value)}
              placeholder="输入项目名称"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          )}
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>提出原因</label>
          <textarea
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            placeholder="描述签证提出的原因，如：遭村民阻扰停工半天、规划调整导致返工..."
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
      </div>

      {/* ── 工程量签证专用 ── */}
      {form.type === "quantity" && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>工程量明细</label>
            <button
              onClick={() => set("items", [...form.items, { ...EMPTY_ITEM }])}
              className="text-xs px-2 py-1 rounded"
              style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}
            >
              + 添加行
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  {["工程内容", "数量", "单位", "单价(元)"].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                  <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>小计</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-1 py-1.5">
                      <input
                        value={item.desc}
                        onChange={(e) => handleItemChange(idx, "desc", e.target.value)}
                        placeholder="如：人工挖沟槽"
                        className="w-full px-2 py-1 rounded text-xs outline-none"
                        style={{ background: "var(--bg)", color: "var(--text)" }}
                      />
                    </td>
                    <td className="px-1 py-1.5 w-16">
                      <input
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                        type="number"
                        placeholder="0"
                        className="w-full px-2 py-1 rounded text-xs outline-none text-right"
                        style={{ background: "var(--bg)", color: "var(--text)" }}
                      />
                    </td>
                    <td className="px-1 py-1.5 w-14">
                      <input
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        placeholder="m³"
                        className="w-full px-2 py-1 rounded text-xs outline-none"
                        style={{ background: "var(--bg)", color: "var(--text)" }}
                      />
                    </td>
                    <td className="px-1 py-1.5 w-20">
                      <input
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                        type="number"
                        placeholder="0"
                        className="w-full px-2 py-1 rounded text-xs outline-none text-right"
                        style={{ background: "var(--bg)", color: "var(--text)" }}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono" style={{ color: "var(--accent)" }}>
                      {calcItemTotal(item) > 0 ? `¥${calcItemTotal(item).toLocaleString()}` : "-"}
                    </td>
                    <td className="pr-1">
                      {form.items.length > 1 && (
                        <button
                          onClick={() => set("items", form.items.filter((_, i) => i !== idx))}
                          className="p-1 rounded opacity-50 hover:opacity-100"
                          style={{ color: "#ef4444" }}
                        >×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium" style={{ color: "var(--muted)" }}>合计</td>
                  <td className="px-2 py-2 text-right font-mono font-bold" style={{ color: "var(--amber, #f59e0b)" }}>
                    {computedAmount > 0 ? `¥${computedAmount.toLocaleString()}` : "-"}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {computedAmount === 0 && (
            <div className="mt-2">
              <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>或直接填写金额（元）</label>
              <input
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                type="number"
                placeholder="0"
                className="w-40 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── 工期签证专用 ── */}
      {form.type === "period" && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>延期天数（日历天）</label>
            <input
              value={form.daysExtended}
              onChange={(e) => set("daysExtended", e.target.value)}
              type="number"
              placeholder="例：62"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs mb-1.5 block" style={{ color: "var(--muted)" }}>延期原因说明</label>
            <textarea
              value={form.periodReason}
              onChange={(e) => set("periodReason", e.target.value)}
              placeholder="详细说明延期原因，如：因村民阻扰、规划调整等..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim() || !form.submitter.trim() || !form.project.trim() || submitting}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
        >
          {submitting ? "提交中..." : "确认发起"}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">取消</button>
      </div>
    </div>
  );
}

// ─── Visa Card ────────────────────────────────────────────────────────────────

function VisaCard({ visa, onUpdate }: { visa: Visa; onUpdate: (id: number, status: "approved" | "rejected") => void }) {
  const s = STATUS_MAP[visa.status];
  const t = TYPE_MAP[visa.type ?? "quantity"];
  const [expanded, setExpanded] = useState(false);
  const hasItems = visa.items && (visa.items as VisaItem[]).length > 0;

  return (
    <div
      className="glass rounded-xl p-5"
      style={{ borderLeft: `2px solid ${visa.status === "pending" ? "var(--amber, #f59e0b)" : "var(--border)"}` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
              {visa.serialNo ?? `#${String(visa.id).padStart(3, "0")}`}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: t.bg, color: t.color }}>{t.label}</span>
          </div>

          {/* Title */}
          <p className="text-sm text-white mb-1 leading-snug">{visa.title}</p>

          {/* Reason */}
          {visa.reason && (
            <p className="text-xs mb-1 line-clamp-2" style={{ color: "var(--muted)" }}>{visa.reason}</p>
          )}

          {/* Period info */}
          {visa.type === "period" && visa.daysExtended && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-mono font-bold" style={{ color: "#c084fc" }}>+{visa.daysExtended} 天</span>
              {visa.periodReason && <span className="text-xs" style={{ color: "var(--muted)" }}>· {visa.periodReason.slice(0, 30)}</span>}
            </div>
          )}

          {/* Items expand toggle */}
          {hasItems && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs mt-1.5"
              style={{ color: "var(--accent)" }}
            >
              {expanded ? "收起明细 ▲" : `查看明细 (${(visa.items as VisaItem[]).length} 行) ▼`}
            </button>
          )}

          {/* Items table */}
          {expanded && hasItems && (
            <div className="mt-2 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--bg)" }}>
                    {["工程内容", "数量", "单位", "单价", "小计"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(visa.items as VisaItem[]).map((item, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-2 py-1.5 text-white">{item.desc}</td>
                      <td className="px-2 py-1.5 font-mono text-right" style={{ color: "var(--text)" }}>{item.qty}</td>
                      <td className="px-2 py-1.5" style={{ color: "var(--muted)" }}>{item.unit}</td>
                      <td className="px-2 py-1.5 font-mono text-right" style={{ color: "var(--muted)" }}>¥{item.unitPrice}</td>
                      <td className="px-2 py-1.5 font-mono text-right font-medium" style={{ color: "var(--accent)" }}>
                        ¥{calcItemTotal(item).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            {visa.submitter} · {fmtDate(visa.createdAt)}
          </div>
        </div>

        {/* Amount + actions */}
        <div className="text-right shrink-0">
          {visa.type === "quantity" && (
            <div className="text-lg font-mono font-bold" style={{
              color: visa.status === "pending" ? "var(--amber, #f59e0b)" : visa.status === "approved" ? "var(--green, #10b981)" : "#ef4444"
            }}>
              ¥{visa.amount.toLocaleString()}
            </div>
          )}
          {visa.status === "pending" && (
            <div className="flex gap-2 mt-2">
              <button className="btn-primary text-xs py-1.5 px-3" onClick={() => onUpdate(visa.id, "approved")}>批复</button>
              <button className="btn-ghost text-xs" onClick={() => onUpdate(visa.id, "rejected")}>驳回</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VisasPage() {
  const [visas, setVisas] = useState<Visa[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/visas").then((r) => r.json());
      setVisas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetch("/api/projects").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setProjects(d);
    }).catch(() => {});
  }, [fetchAll]);

  const handleUpdate = async (id: number, status: "approved" | "rejected") => {
    setUpdateError(null);
    setVisas((prev) => prev.map((v) => v.id === id ? { ...v, status } : v));
    try {
      const res = await fetch(`/api/visas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "操作失败");
      }
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "操作失败，请重试");
      fetchAll();
    }
  };

  // Filtered list
  const filtered = visas.filter((v) => {
    if (filterProject !== "all" && v.project !== filterProject) return false;
    if (filterType !== "all" && v.type !== filterType) return false;
    return true;
  });

  // Group by project
  const grouped = filtered.reduce<Record<string, Visa[]>>((acc, v) => {
    (acc[v.project] = acc[v.project] ?? []).push(v);
    return acc;
  }, {});

  const pending = visas.filter((v) => v.status === "pending");
  const pendingTotal = pending.reduce((s, v) => s + v.amount, 0);

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">签证管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading
              ? "加载中..."
              : pending.length > 0
              ? `${pending.length} 项待批复 · 涉及 ¥${pendingTotal.toLocaleString()}`
              : `共 ${visas.length} 条记录`}
          </p>
        </div>
        <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowForm(true)}>+ 发起签证</button>
      </div>

      <div className="px-8 py-6 space-y-4">
        {/* Create Form */}
        {showForm && (
          <CreateForm
            projects={projects}
            onSuccess={() => { setShowForm(false); fetchAll(); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error banner */}
        {updateError && (
          <div className="rounded-xl px-5 py-3 flex justify-between items-center"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <span className="text-sm" style={{ color: "#ef4444" }}>{updateError}</span>
            <button onClick={() => setUpdateError(null)} className="text-xs" style={{ color: "var(--muted)" }}>✕</button>
          </div>
        )}

        {/* Pending total banner */}
        {!loading && pending.length > 0 && (
          <div className="rounded-xl px-5 py-3 flex justify-between items-center"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <span className="text-sm" style={{ color: "var(--muted)" }}>待批复签证总额</span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--accent)" }}>
              ¥{pendingTotal.toLocaleString()}
            </span>
          </div>
        )}

        {/* Filters */}
        {!loading && visas.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="all">全部项目</option>
              {[...new Set(visas.map((v) => v.project))].map((p) => (
                <option key={p} value={p} style={{ background: "#0d1929" }}>{p}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="all">全部类型</option>
              <option value="quantity" style={{ background: "#0d1929" }}>工程量签证</option>
              <option value="period" style={{ background: "#0d1929" }}>工期签证</option>
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
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无签证记录</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>点击右上角发起新签证</span>
          </div>
        )}

        {/* Grouped by project */}
        {Object.entries(grouped).map(([projectName, projectVisas]) => {
          const pPending = projectVisas.filter((v) => v.status === "pending");
          const pTotal = pPending.reduce((s, v) => s + v.amount, 0);
          return (
            <div key={projectName}>
              {/* Project header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{projectName}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                    {projectVisas.length} 条
                  </span>
                  {pPending.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: "rgba(245,158,11,0.1)", color: "var(--amber, #f59e0b)" }}>
                      {pPending.length} 待批复
                    </span>
                  )}
                </div>
                {pTotal > 0 && (
                  <span className="text-sm font-mono font-bold" style={{ color: "var(--amber, #f59e0b)" }}>
                    ¥{pTotal.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {projectVisas.map((v) => (
                  <VisaCard key={v.id} visa={v} onUpdate={handleUpdate} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
