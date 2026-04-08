"use client";
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string; project: string; phone?: string | null; wageType?: string | null; wageRate?: number | null };
type ReportRecord = { id: number; task: string; spec: string; qty: string; status: string; createdAt: string; workerName: string; project: string; totalValue?: number | null };
type CheckInRecord = { id: number; workerId: string; createdAt: string; project: string; type: string };
type Correction = { id: number; workerId: string; workerName: string; original: string; corrected: string; reason: string; status: string; createdAt: string; reportId?: number | null };
type Tab = "pending" | "attendance" | "workers" | "corrections";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${fmtTime(iso)}`;
}

function Spinner() {
  return (
    <div className="flex gap-1.5 justify-center py-16">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function ForemanLogin({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!pin.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "PIN 错误"); return; }
      onLogin();
    } catch { setError("网络错误，请重试"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">班组长端</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>输入管理员 PIN 登录</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <input
          type="tel" inputMode="numeric" maxLength={8}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="管理员 PIN"
          className="w-full rounded-2xl px-5 py-4 text-center text-2xl font-mono tracking-[0.4em] outline-none"
          style={{ background: "var(--surface)", border: `1px solid ${error ? "#ef4444" : "var(--border)"}`, color: "var(--text)" }}
          autoFocus
        />
        {error && <div className="text-center text-sm" style={{ color: "#ef4444" }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading || !pin.trim()} className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40" style={{ background: "var(--amber)", color: "#000" }}>
          {loading ? "验证中..." : "登录"}
        </button>
      </div>
    </div>
  );
}

// ─── Pending Reports Tab ──────────────────────────────────────────────────────

function PendingTab() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);

  const load = () => {
    fetch("/api/reports?status=pending&limit=100")
      .then((r) => r.json())
      .then((data) => { setReports(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const act = async (id: number, action: "verify" | "reject") => {
    setActioning(id);
    try {
      await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, operatorId: "foreman" }),
      });
      setReports((prev) => prev.filter((r) => r.id !== id));
    } finally { setActioning(null); }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">待审报量</h2>
        <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold" style={{ background: "rgba(245,158,11,0.12)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.25)" }}>{reports.length}</span>
      </div>
      {loading ? <Spinner /> : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          <span className="text-sm" style={{ color: "var(--muted)" }}>全部审完了</span>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold text-white">{r.workerName}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>{r.project}</span>
                </div>
                <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl text-xs mb-3" style={{ background: "var(--bg)" }}>
                {([["工序", r.task], ["规格", r.spec], ["数量", r.qty]] as [string, string][]).map(([k, v]) => (
                  <div key={k}><div style={{ color: "var(--muted)" }}>{k}</div><div className="font-medium text-white mt-0.5 break-all">{v}</div></div>
                ))}
              </div>
              {r.totalValue != null && (
                <div className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                  产值 <span className="font-mono font-bold" style={{ color: "var(--green)" }}>¥{r.totalValue.toLocaleString()}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => act(r.id, "verify")}
                  disabled={actioning === r.id}
                  className="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)" }}
                >
                  {actioning === r.id ? "..." : "通过"}
                </button>
                <button
                  onClick={() => act(r.id, "reject")}
                  disabled={actioning === r.id}
                  className="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                >
                  驳回
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceTab() {
  const [checkins, setCheckins] = useState<CheckInRecord[]>([]);
  const [workers, setWorkers] = useState<Map<string, Worker>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/checkin").then((r) => r.json()).catch(() => []),
      fetch("/api/workers").then((r) => r.json()).catch(() => []),
    ]).then(([cis, ws]) => {
      setCheckins(Array.isArray(cis) ? cis : []);
      const map = new Map<string, Worker>();
      if (Array.isArray(ws)) ws.forEach((w: Worker) => map.set(w.id, w));
      setWorkers(map);
      setLoading(false);
    });
  }, []);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCheckins = checkins.filter((ci) => new Date(ci.createdAt) >= todayStart);
  const displayed = showAll ? checkins : todayCheckins;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">{showAll ? "全部出勤" : "今日出勤"}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.25)" }}>{displayed.length} 人</span>
          <button onClick={() => setShowAll((p) => !p)} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
            {showAll ? "只看今日" : "全部"}
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : displayed.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无出勤记录</div>
      ) : (
        <div className="space-y-2">
          {displayed.map((ci) => {
            const w = workers.get(ci.workerId);
            return (
              <div key={ci.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "rgba(16,185,129,0.12)", color: "var(--green)" }}>
                  {w ? w.name[0] : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{w ? w.name : ci.workerId}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{ci.project}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-white">{fmtTime(ci.createdAt)}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{new Date(ci.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Workers Tab ──────────────────────────────────────────────────────────────

function WorkersTab() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/workers").then((r) => r.json()).then((data) => { setWorkers(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = workers.filter((w) => !search || w.name.includes(search) || w.project.includes(search) || (w.phone ?? "").includes(search));
  const wageLabels: Record<string, string> = { daily: "日薪", monthly: "月薪", piecework: "计件" };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 pt-6 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">工人管理</h2>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.2)" }}>{workers.length} 人</span>
        </div>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索姓名 / 项目 / 手机号"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--muted)" }}>无匹配工人</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "rgba(59,130,246,0.12)", color: "var(--accent)" }}>{w.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{w.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{w.project}{w.phone ? ` · ${w.phone}` : ""}</div>
                </div>
                {w.wageType && w.wageRate && (
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-semibold" style={{ color: "var(--green)" }}>¥{w.wageRate.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{wageLabels[w.wageType] ?? w.wageType}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Corrections Tab ──────────────────────────────────────────────────────────

function CorrectionsTab() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const load = () => {
    fetch("/api/corrections").then((r) => r.json()).then((data) => { setCorrections(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const act = async (id: number, status: "approved" | "rejected") => {
    setActioning(id);
    try {
      await fetch(`/api/corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, operatorId: "foreman" }),
      });
      setCorrections((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    } finally { setActioning(null); }
  };

  const STATUS_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending:  { label: "待审",  color: "var(--amber)", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)"  },
    approved: { label: "已批",  color: "var(--green)", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)"  },
    rejected: { label: "已驳",  color: "#ef4444",       bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)"   },
  };

  const displayed = filter === "pending" ? corrections.filter((c) => c.status === "pending") : corrections;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">纠偏审核</h2>
        <button onClick={() => setFilter((p) => p === "pending" ? "all" : "pending")} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
          {filter === "pending" ? "只看待审" : "全部"}
        </button>
      </div>

      {loading ? <Spinner /> : displayed.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无纠偏申请</div>
      ) : (
        <div className="space-y-3">
          {displayed.map((c) => {
            const s = STATUS_COLORS[c.status] ?? STATUS_COLORS.pending;
            let parsedCorrect: { task?: string; spec?: string; qty?: string } | null = null;
            try { parsedCorrect = JSON.parse(c.corrected); } catch {}
            return (
              <div key={c.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-semibold text-white">{c.workerName}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>{fmtDate(c.createdAt)}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{s.label}</span>
                </div>
                <div className="text-xs mb-2 p-2.5 rounded-xl" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                  <div className="mb-1">原始：{c.original}</div>
                  {parsedCorrect && (
                    <div style={{ color: "var(--amber)" }}>
                      修改为：{parsedCorrect.task && `工序: ${parsedCorrect.task}`}{parsedCorrect.spec && ` 规格: ${parsedCorrect.spec}`}{parsedCorrect.qty && ` 数量: ${parsedCorrect.qty}`}
                    </div>
                  )}
                </div>
                <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>原因：{c.reason}</div>
                {c.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => act(c.id, "approved")} disabled={actioning === c.id} className="py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)" }}>
                      {actioning === c.id ? "..." : "批准"}
                    </button>
                    <button onClick={() => act(c.id, "rejected")} disabled={actioning === c.id} className="py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
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
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    key: "pending", label: "待审",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--amber)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    key: "attendance", label: "出勤",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--green)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    key: "workers", label: "工人",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "corrections", label: "纠偏",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#a78bfa)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
];

const TAB_ACCENT: Record<Tab, string> = {
  pending: "var(--amber)",
  attendance: "var(--green)",
  workers: "var(--accent)",
  corrections: "#a78bfa",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ForemanPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");

  if (!loggedIn) return <ForemanLogin onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col max-w-sm mx-auto" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span className="text-sm font-bold text-white tracking-tight">班组长端</span>
        </div>
        <button onClick={() => setLoggedIn(false)} className="text-xs" style={{ color: "var(--muted)" }}>退出</button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {tab === "pending"     && <PendingTab />}
        {tab === "attendance"  && <AttendanceTab />}
        {tab === "workers"     && <WorkersTab />}
        {tab === "corrections" && <CorrectionsTab />}
      </div>

      {/* Bottom Tab Bar */}
      <div className="shrink-0 border-t grid grid-cols-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)} className="flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all active:opacity-70">
            {icon(tab === key)}
            <span className="text-[10px] font-medium" style={{ color: tab === key ? TAB_ACCENT[key] : "var(--muted)" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
