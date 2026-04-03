"use client";
import { useState, useEffect } from "react";

interface Equipment {
  id: number;
  name: string;
  code: string | null;
  projectCode: string | null;
  lastCheckDate: string | null;
  nextCheckDate: string | null;
  status: string;
  note: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  normal:  { label: "正常",   color: "var(--green)", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)"  },
  warning: { label: "即将到期", color: "var(--amber)", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)"  },
  overdue: { label: "已超期",  color: "#ef4444",      bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)"   },
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", code: "", projectCode: "", lastCheckDate: "", nextCheckDate: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!form.name.trim()) { setErr("请填写工器具名称"); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "添加失败"); return; }
      onAdded();
    } catch { setErr("网络错误"); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-white">新增工器具</h2>
        {[
          { key: "name", label: "名称*", type: "text" },
          { key: "code", label: "编号", type: "text" },
          { key: "projectCode", label: "所属项目", type: "text" },
          { key: "lastCheckDate", label: "上次年检", type: "date" },
          { key: "nextCheckDate", label: "下次年检", type: "date" },
          { key: "note", label: "备注", type: "text" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>{label}</label>
            <input
              type={type}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-transparent"
              style={{ border: "1px solid var(--border)" }}
            />
          </div>
        ))}
        {err && <p className="text-xs" style={{ color: "#f87171" }}>{err}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(59,130,246,0.18)", border: "1px solid rgba(59,130,246,0.35)", color: "var(--accent)" }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm transition-all"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "warning" | "overdue">("all");
  const [showAdd, setShowAdd] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/equipment" : `/api/equipment?status=${filter}`;
      const data = await fetch(url).then((r) => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const warningCount = items.filter((e) => e.status === "warning" || e.status === "overdue").length;

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">工器具管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {warningCount > 0
              ? <span style={{ color: "var(--amber)" }}>{warningCount} 件即将到期或已超期</span>
              : "年检状态全部正常"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["all", "warning", "overdue"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: filter === s ? "rgba(59,130,246,0.2)" : "var(--surface)",
                  border: `1px solid ${filter === s ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                  color: filter === s ? "var(--accent)" : "var(--muted)",
                }}
              >
                {{ all: "全部", warning: "预警", overdue: "超期" }[s]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "var(--accent)" }}
          >
            + 新增
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex gap-1.5 justify-center py-20">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>暂无工器具记录</div>
        ) : (
          <div className="space-y-3">
            {items.map((eq) => {
              const sc = STATUS_CFG[eq.status] ?? STATUS_CFG.normal;
              const days = daysUntil(eq.nextCheckDate);
              return (
                <div
                  key={eq.id}
                  className="rounded-2xl p-5"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${eq.status !== "normal" ? sc.border : "var(--border)"}`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{eq.name}</span>
                        {eq.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                            {eq.code}
                          </span>
                        )}
                      </div>
                      {eq.projectCode && (
                        <div className="text-xs" style={{ color: "var(--muted)" }}>项目：{eq.projectCode}</div>
                      )}
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                      style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                    >
                      {sc.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div style={{ color: "var(--muted)" }}>
                      上次年检
                      <div className="text-white mt-0.5 font-mono">
                        {eq.lastCheckDate ? eq.lastCheckDate.slice(0, 10) : "—"}
                      </div>
                    </div>
                    <div style={{ color: "var(--muted)" }}>
                      下次年检
                      <div className="mt-0.5 font-mono" style={{ color: sc.color }}>
                        {eq.nextCheckDate ? eq.nextCheckDate.slice(0, 10) : "—"}
                        {days !== null && (
                          <span className="ml-2 text-[10px]">
                            {days < 0 ? `已超期 ${Math.abs(days)} 天` : days === 0 ? "今日到期" : `还剩 ${days} 天`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overdue urgent banner */}
                  {eq.status === "overdue" && (
                    <div
                      className="mt-3 px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                    >
                      年检已逾期，请立即安排检验，禁止继续使用
                    </div>
                  )}
                  {eq.status === "warning" && days !== null && days <= 3 && (
                    <div
                      className="mt-3 px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "var(--amber)" }}
                    >
                      距到期不足 3 天，请优先安排年检
                    </div>
                  )}

                  {eq.note && (
                    <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>备注：{eq.note}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); fetchData(); }}
        />
      )}
    </div>
  );
}
