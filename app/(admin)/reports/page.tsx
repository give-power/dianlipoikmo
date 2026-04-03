"use client";
import { useState, useEffect, useCallback } from "react";

interface Report {
  id: number;
  workerName: string;
  project: string;
  task: string;
  spec: string;
  qty: string;
  status: string;
  photoUrls: string[];
  gpsLat: number | null;
  gpsLng: number | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: "待审",   color: "var(--amber)", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)"  },
  verified: { label: "已核准", color: "var(--green)", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)"  },
  rejected: { label: "已驳回", color: "#ef4444",      bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)"   },
};

function PhotoModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full px-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[idx]} alt="报量照片" className="w-full rounded-2xl object-contain max-h-[70vh]" />
        {urls.length > 1 && (
          <div className="flex justify-center gap-3 mt-4">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === idx ? "var(--accent)" : "var(--border)" }}
              />
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-2 right-6 text-white text-2xl leading-none"
        >×</button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [photoUrls, setPhotoUrls] = useState<string[] | null>(null);
  const [acting, setActing] = useState<number | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus === "all"
        ? "/api/reports?limit=100"
        : `/api/reports?status=${filterStatus}&limit=100`;
      const data = await fetch(url).then((r) => r.json());
      setReports(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleAction = async (id: number, action: "verify" | "reject") => {
    setActing(id);
    try {
      await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchReports();
    } finally {
      setActing(null);
    }
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">报量审核</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {pendingCount > 0 ? `${pendingCount} 条待审核` : "全部已处理"}
          </p>
        </div>
        <div className="flex gap-1">
          {(["pending", "verified", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: filterStatus === s ? "rgba(59,130,246,0.2)" : "var(--surface)",
                border: `1px solid ${filterStatus === s ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                color: filterStatus === s ? "var(--accent)" : "var(--muted)",
              }}
            >
              {{ pending: "待审", verified: "已核准", rejected: "已驳回", all: "全部" }[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex gap-1.5 justify-center py-20">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>暂无记录</div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const sc = STATUS_CFG[r.status] ?? STATUS_CFG.pending;
              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-5"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{r.workerName}</span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{r.project}</span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                      style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                    >
                      {sc.label}
                    </span>
                  </div>

                  {/* Report data */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-xl mb-4 text-xs" style={{ background: "var(--bg)" }}>
                    {[["工序", r.task], ["规格", r.spec], ["数量", r.qty]].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ color: "var(--muted)" }}>{k}</div>
                        <div className="font-medium text-white mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Photos */}
                  {r.photoUrls.length > 0 && (
                    <button
                      onClick={() => setPhotoUrls(r.photoUrls)}
                      className="flex items-center gap-1.5 mb-4 text-xs transition-all"
                      style={{ color: "var(--accent)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      查看 {r.photoUrls.length} 张照片
                    </button>
                  )}

                  {/* GPS */}
                  {r.gpsLat && r.gpsLng && (
                    <div className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
                      GPS: {r.gpsLat.toFixed(5)}, {r.gpsLng.toFixed(5)}
                    </div>
                  )}

                  {/* Verified info */}
                  {r.verifiedBy && (
                    <div className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                      {r.status === "verified" ? "核准" : "驳回"}人：{r.verifiedBy}
                      {r.verifiedAt && ` · ${fmtDate(r.verifiedAt)}`}
                    </div>
                  )}

                  {/* Action buttons */}
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(r.id, "verify")}
                        disabled={acting === r.id}
                        className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)" }}
                      >
                        {acting === r.id ? "处理中..." : "核准"}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "reject")}
                        disabled={acting === r.id}
                        className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                      >
                        驳回
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {photoUrls && <PhotoModal urls={photoUrls} onClose={() => setPhotoUrls(null)} />}
    </div>
  );
}
