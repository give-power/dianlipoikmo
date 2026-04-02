"use client";
import { useState, useEffect, useCallback } from "react";

interface Visa {
  id: number;
  title: string;
  amount: number;
  submitter: string;
  project: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_MAP = {
  pending:  { label: "待批复", bg: "rgba(245,158,11,0.12)",  color: "var(--amber)" },
  approved: { label: "已批复", bg: "rgba(16,185,129,0.12)",  color: "var(--green)" },
  rejected: { label: "已驳回", bg: "rgba(239,68,68,0.1)",    color: "#ef4444"      },
};

export default function VisasPage() {
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);

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
  }, [fetchAll]);

  const update = async (id: number, status: "approved" | "rejected") => {
    setUpdateError(null);
    // Optimistic update
    setVisas((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
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
      fetchAll(); // revert optimistic update
    }
  };

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
        <button className="btn-primary">+ 发起签证</button>
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
        {/* Pending total banner */}
        {!loading && pending.length > 0 && (
          <div
            className="rounded-xl px-5 py-3 flex justify-between items-center"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <span className="text-sm" style={{ color: "var(--muted)" }}>待批复签证总额</span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--accent)" }}>
              ¥{pendingTotal.toLocaleString()}
            </span>
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
        {!loading && visas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无签证记录</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>点击右上角发起新签证</span>
          </div>
        )}

        {/* Visa cards */}
        {visas.map((v) => {
          const s = STATUS_MAP[v.status];
          return (
            <div
              key={v.id}
              className="glass rounded-xl p-5"
              style={{
                borderLeft: v.status === "pending" ? "2px solid var(--amber)" : "2px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                      #{String(v.id).padStart(3, "0")}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}
                    >
                      {v.project}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm text-white mb-1 leading-snug">{v.title}</p>

                  {/* Footer */}
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {v.submitter} · {fmtDate(v.createdAt)}
                  </div>
                </div>

                {/* Amount + actions */}
                <div className="text-right shrink-0">
                  <div
                    className="text-lg font-mono font-bold"
                    style={{ color: v.status === "pending" ? "var(--amber)" : v.status === "approved" ? "var(--green)" : "#ef4444" }}
                  >
                    ¥{v.amount.toLocaleString()}
                  </div>
                  {v.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        className="btn-primary text-xs py-1.5 px-3"
                        onClick={() => update(v.id, "approved")}
                      >
                        批复
                      </button>
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => update(v.id, "rejected")}
                      >
                        驳回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
