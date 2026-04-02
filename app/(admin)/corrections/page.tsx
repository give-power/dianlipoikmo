"use client";
import { useState, useEffect, useCallback } from "react";

interface Correction {
  id: number;
  workerName: string;
  original: string;
  corrected: string;
  reason: string;
  reportId?: number | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_MAP = {
  pending:  { label: "待确认", bg: "rgba(245,158,11,0.12)",  color: "var(--amber)" },
  approved: { label: "已确认", bg: "rgba(16,185,129,0.12)",  color: "var(--green)" },
  rejected: { label: "已驳回", bg: "rgba(239,68,68,0.1)",    color: "#ef4444"      },
};

export default function CorrectionsPage() {
  const [items, setItems] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/corrections").then((r) => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const update = async (id: number, status: "approved" | "rejected") => {
    setUpdateError(null);
    // Optimistic update
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      const res = await fetch(`/api/corrections/${id}`, {
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
      fetchAll(); // Revert optimistic update
    }
  };

  const pending = items.filter((c) => c.status === "pending");

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">纠偏中心</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "加载中..." : `共 ${items.length} 条 · ${pending.length} 项待确认`}
          </p>
        </div>
        {!loading && pending.length > 0 && (
          <span
            className="text-xs font-mono px-3 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)" }}
          >
            {pending.length} 项待确认
          </span>
        )}
      </div>

      <div className="px-8 py-6 space-y-3">
        {/* Error banner */}
        {updateError && (
          <div
            className="rounded-xl px-5 py-3 flex justify-between items-center"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <span className="text-sm" style={{ color: "#ef4444" }}>{updateError}</span>
            <button onClick={() => setUpdateError(null)} className="text-xs" style={{ color: "var(--muted)" }}>✕</button>
          </div>
        )}
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无纠偏记录</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>工人提交纠偏申请后会在此显示</span>
          </div>
        )}

        {/* Items */}
        {items.map((item) => {
          const s = STATUS_MAP[item.status];
          return (
            <div
              key={item.id}
              className="glass rounded-xl p-5"
              style={{
                borderLeft: item.status === "pending" ? "2px solid var(--amber)" : "2px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                      #{String(item.id).padStart(3, "0")}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    <span className="text-xs font-medium text-white">{item.workerName}</span>
                    {item.reportId && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.2)" }}
                      >
                        报量#{item.reportId}
                      </span>
                    )}
                    <span className="text-xs font-mono ml-auto" style={{ color: "var(--muted)" }}>
                      {fmtTime(item.createdAt)}
                    </span>
                  </div>

                  {/* Change row */}
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span
                      className="px-2 py-1 rounded text-xs line-through"
                      style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}
                    >
                      {item.original}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{ background: "rgba(16,185,129,0.08)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.15)" }}
                    >
                      {item.corrected}
                    </span>
                  </div>

                  {/* Reason */}
                  {item.reason && (
                    <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                      理由：{item.reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {item.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="btn-primary text-xs py-1.5 px-3"
                      onClick={() => update(item.id, "approved")}
                    >
                      确认
                    </button>
                    <button
                      className="btn-ghost text-xs"
                      onClick={() => update(item.id, "rejected")}
                    >
                      驳回
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
