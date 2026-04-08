"use client";
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string; project: string; wageType?: string | null; wageRate?: number | null };
type ReportRecord = { id: number; task: string; spec: string; qty: string; status: string; createdAt: string; project: string };
type CheckInRecord = { id: number; workerId: string; createdAt: string; project: string; type: string };
type CorrectionTarget = { reportId: number; task: string; spec: string; qty: string };
type Tab = "today" | "report" | "history" | "me";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${fmtTime(iso)}`;
}

const STATUS_MAP = {
  pending:  { label: "待审", color: "var(--amber)", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)"  },
  verified: { label: "已审", color: "var(--green)", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)"  },
  rejected: { label: "驳回", color: "#ef4444",       bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)"   },
};

const TASK_PRESETS = ["穿线管", "接线盒", "配电箱", "布线", "接线", "桥架", "开关插座", "灯具安装"];

// ─── CorrectionModal ──────────────────────────────────────────────────────────

function CorrectionModal({ target, worker, onClose }: { target: CorrectionTarget; worker: Worker; onClose: () => void }) {
  const [task, setTask] = useState(target.task);
  const [spec, setSpec] = useState(target.spec);
  const [qty, setQty] = useState(target.qty);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: worker.id, workerName: worker.name,
          original: `工序:${target.task} 规格:${target.spec} 数量:${target.qty}`,
          corrected: JSON.stringify({ task, spec, qty }),
          reason, reportId: target.reportId,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.error ?? "提交失败"); return; }
      setDone(true);
    } catch { setError("网络错误，请重试"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-3xl p-6 pb-10" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "2px solid var(--green)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="text-base font-semibold text-white mb-1">纠偏申请已提交</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted)" }}>等待班组长确认后生效</div>
            <button className="btn-ghost" onClick={onClose}>关闭</button>
          </div>
        ) : (
          <>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
            <div className="text-base font-semibold text-white mb-4">申请纠偏</div>
            {[{ label: "工序", value: task, set: setTask }, { label: "规格", value: spec, set: setSpec }, { label: "数量", value: qty, set: setQty }].map(({ label, value, set }) => (
              <div key={label} className="mb-3">
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{label}</div>
                <input value={value} onChange={(e) => set(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
            ))}
            <div className="mb-5">
              <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>纠偏原因 <span style={{ color: "#ef4444" }}>*</span></div>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="说明原因，例如：录入时数量搞错了" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            {error && <div className="mb-3 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>{error}</div>}
            <button onClick={handleSubmit} disabled={!reason.trim() || submitting} className="btn-primary w-full py-4 rounded-xl text-base mb-2 disabled:opacity-50">{submitting ? "提交中..." : "提交纠偏申请"}</button>
            <button className="btn-ghost w-full py-3" onClick={onClose}>取消</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (w: Worker) => void }) {
  const [pin, setPin] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Worker[] | null>(null);

  const handleSubmit = async () => {
    const trimmed = pin.trim();
    if (!trimmed) return;
    setSearching(true); setError(null); setCandidates(null);
    try {
      const res = await fetch("/api/workers/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: trimmed }) });
      const data = await res.json();
      if (res.ok && !data.multiple) { onLogin(data as Worker); }
      else if (data.multiple) { setCandidates(data.workers); }
      else { setError(data.error ?? "未找到匹配工人"); }
    } catch { setError("网络错误，请重试"); }
    finally { setSearching(false); }
  };

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">工人端</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>输入手机后4位 / 身份证后4位</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <input
          type="tel" inputMode="numeric" maxLength={6}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(null); setCandidates(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="输入工号 / 手机后4位"
          className="w-full rounded-2xl px-5 py-4 text-center text-2xl font-mono tracking-[0.4em] outline-none"
          style={{ background: "var(--surface)", border: `1px solid ${error ? "#ef4444" : "var(--border)"}`, color: "var(--text)" }}
          autoFocus
        />
        {error && <div className="text-center text-sm" style={{ color: "#ef4444" }}>{error}</div>}
        {candidates && (
          <div className="space-y-2">
            <div className="text-xs text-center" style={{ color: "var(--muted)" }}>找到多个匹配，请选择：</div>
            {candidates.map((w) => (
              <button key={w.id} onClick={() => onLogin(w)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}>{w.name[0]}</div>
                <div className="text-left"><div className="text-sm font-semibold text-white">{w.name}</div><div className="text-xs" style={{ color: "var(--muted)" }}>{w.project}</div></div>
              </button>
            ))}
          </div>
        )}
        <button onClick={handleSubmit} disabled={searching || !pin.trim()} className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40" style={{ background: "var(--accent)", color: "#fff" }}>
          {searching ? "验证中..." : "确认登录"}
        </button>
      </div>
      <p className="text-xs text-center" style={{ color: "var(--muted)" }}>没有 PIN？请联系班组长为您设置</p>
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab({ worker }: { worker: Worker }) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkinTime, setCheckinTime] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      fetch("/api/checkin").then((r) => r.json()).catch(() => []),
      fetch(`/api/reports?workerId=${encodeURIComponent(worker.id)}`).then((r) => r.json()).catch(() => []),
    ]).then(([checkins, reports]) => {
      const mine = Array.isArray(checkins) ? checkins.find((ci: CheckInRecord) => ci.workerId === worker.id && new Date(ci.createdAt) >= todayStart) : null;
      const todayReps = Array.isArray(reports) ? reports.filter((r: ReportRecord) => new Date(r.createdAt) >= todayStart) : [];
      setCheckedIn(!!mine);
      if (mine) setCheckinTime(fmtTime(mine.createdAt));
      setTodayCount(todayReps.length);
      setLoading(false);
    });
  };

  useEffect(() => { refresh(); }, [worker.id]);

  const handleCheckIn = async () => {
    setChecking(true); setError(null);
    let gpsLat = null, gpsLng = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      gpsLat = pos.coords.latitude; gpsLng = pos.coords.longitude;
    } catch {}
    try {
      const res = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workerId: worker.id, project: worker.project, gpsLat, gpsLng }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.error ?? "打卡失败，请重试"); return; }
      refresh();
    } catch { setError("网络错误，请重试"); }
    finally { setChecking(false); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex gap-1.5">{[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />)}</div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">你好，{worker.name}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{worker.project}</p>
      </div>

      <div className="rounded-2xl p-5" style={{ background: checkedIn ? "rgba(16,185,129,0.07)" : "rgba(59,130,246,0.06)", border: `1px solid ${checkedIn ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.2)"}` }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: checkedIn ? "var(--green)" : "var(--muted)" }} />
          <span className="text-sm font-medium" style={{ color: checkedIn ? "var(--green)" : "var(--muted)" }}>
            {checkedIn ? `今天 ${checkinTime} 已打卡` : "今天尚未打卡"}
          </span>
        </div>
        {!checkedIn ? (
          <>
            {error && <div className="mb-3 px-3 py-2 rounded-xl text-xs text-center" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</div>}
            <button onClick={handleCheckIn} disabled={checking} className="w-full py-4 rounded-xl text-base font-semibold text-white transition-all active:scale-95 disabled:opacity-60" style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 0 24px rgba(16,185,129,0.3)" }}>
              {checking ? "定位中..." : "进场打卡"}
            </button>
          </>
        ) : (
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            今日已报量 <span className="font-mono font-bold text-white mx-1">{todayCount}</span> 条，前往「报量」继续填报
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>今日报量</div>
          <div className="text-3xl font-mono font-bold text-white">{todayCount}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>条记录</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>打卡状态</div>
          <div className="text-base font-semibold mt-2" style={{ color: checkedIn ? "var(--green)" : "var(--amber)" }}>{checkedIn ? "已到场" : "未打卡"}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{checkedIn ? checkinTime : "点上方打卡"}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Report Tab ───────────────────────────────────────────────────────────────

function ReportTab({ worker }: { worker: Worker }) {
  const [task, setTask] = useState("");
  const [spec, setSpec] = useState("");
  const [qty, setQty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTasks, setCustomTasks] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("pl_custom_tasks") ?? "[]"); } catch { return []; }
  });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const addCustomTask = () => {
    const t = customInput.trim();
    if (!t) return;
    const updated = customTasks.includes(t) ? customTasks : [...customTasks, t];
    setCustomTasks(updated);
    localStorage.setItem("pl_custom_tasks", JSON.stringify(updated));
    setTask(t); setCustomInput(""); setShowCustomInput(false);
  };

  const handleSubmit = async () => {
    if (!task.trim() || !qty.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id, workerName: worker.name, project: worker.project, task: task.trim(), spec: spec.trim() || "—", qty: qty.trim() }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.error ?? "提交失败"); return; }
      setSuccess(true); setTask(""); setSpec(""); setQty("");
      setTimeout(() => setSuccess(false), 2500);
    } catch { setError("网络错误，请重试"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <h2 className="text-xl font-bold text-white tracking-tight mb-1">填写报量</h2>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>一次一条，可反复提交</p>

      {success && (
        <div className="mb-4 px-4 py-3 rounded-2xl text-sm text-center font-medium" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)" }}>
          提交成功，继续填下一条
        </div>
      )}

      <div className="mb-5">
        <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>工序 <span style={{ color: "#ef4444" }}>*</span></div>
        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="例：穿线管、接线盒安装" className="w-full rounded-2xl px-4 py-3.5 text-base outline-none mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
        <div className="flex flex-wrap gap-2">
          {[...TASK_PRESETS, ...customTasks].map((t) => (
            <button key={t} onClick={() => setTask(t)} className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95" style={{ background: task === t ? "rgba(59,130,246,0.2)" : "var(--surface)", border: `1px solid ${task === t ? "rgba(59,130,246,0.4)" : "var(--border)"}`, color: task === t ? "var(--accent)" : "var(--muted)" }}>{t}</button>
          ))}
          {!showCustomInput && <button onClick={() => setShowCustomInput(true)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface)", border: "1px dashed rgba(59,130,246,0.35)", color: "var(--accent)" }}>+ 自定义</button>}
        </div>
        {showCustomInput && (
          <div className="flex gap-2 mt-2">
            <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustomTask(); if (e.key === "Escape") setShowCustomInput(false); }} placeholder="工序名称" autoFocus className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "var(--bg)", border: "1px solid rgba(59,130,246,0.4)", color: "var(--text)" }} />
            <button onClick={addCustomTask} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}>确认</button>
            <button onClick={() => setShowCustomInput(false)} className="px-3 py-2 rounded-xl text-sm" style={{ color: "var(--muted)" }}>取消</button>
          </div>
        )}
      </div>

      <div className="mb-5">
        <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>规格（选填）</div>
        <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="例：DN20、BV4mm²、86型" className="w-full rounded-2xl px-4 py-3.5 text-base outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>

      <div className="mb-8">
        <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>数量 <span style={{ color: "#ef4444" }}>*</span></div>
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="例：50m、30个、2套" className="w-full rounded-2xl px-4 py-3.5 text-base outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>

      {error && <div className="mb-4 px-3 py-2.5 rounded-xl text-xs text-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>{error}</div>}

      <button onClick={handleSubmit} disabled={!task.trim() || !qty.trim() || submitting} className="w-full py-5 rounded-2xl text-base font-semibold text-white transition-all active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 0 24px rgba(59,130,246,0.3)" }}>
        {submitting ? "提交中..." : "提交报量"}
      </button>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ worker }: { worker: Worker }) {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [corrTarget, setCorrTarget] = useState<CorrectionTarget | null>(null);

  useEffect(() => {
    fetch(`/api/reports?workerId=${encodeURIComponent(worker.id)}`)
      .then((r) => r.json())
      .then((data) => { setRecords(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [worker.id]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <h2 className="text-xl font-bold text-white tracking-tight mb-4">报量记录</h2>
        {loading ? (
          <div className="flex gap-1.5 justify-center py-16">{[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />)}</div>
        ) : records.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无记录</div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const s = STATUS_MAP[r.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.pending;
              return (
                <div key={r.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{s.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl text-xs" style={{ background: "var(--bg)" }}>
                    {([["工序", r.task], ["规格", r.spec], ["数量", r.qty]] as [string, string][]).map(([k, v]) => (
                      <div key={k}><div style={{ color: "var(--muted)" }}>{k}</div><div className="font-medium text-white mt-0.5 break-all">{v}</div></div>
                    ))}
                  </div>
                  {r.status !== "verified" && (
                    <button onClick={() => setCorrTarget({ reportId: r.id, task: r.task, spec: r.spec, qty: r.qty })} className="mt-3 w-full py-2 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--amber)" }}>
                      申请纠偏
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {corrTarget && <CorrectionModal target={corrTarget} worker={worker} onClose={() => setCorrTarget(null)} />}
    </>
  );
}

// ─── Me Tab ───────────────────────────────────────────────────────────────────

function MeTab({ worker, onLogout }: { worker: Worker; onLogout: () => void }) {
  const [stats, setStats] = useState<{ attendance: number; earnings: number | null; label: string } | null>(null);

  useEffect(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    Promise.all([
      fetch("/api/checkin").then((r) => r.json()).catch(() => []),
      fetch(`/api/reports?workerId=${encodeURIComponent(worker.id)}`).then((r) => r.json()).catch(() => []),
    ]).then(([checkins, reports]) => {
      const attendance = Array.isArray(checkins) ? checkins.filter((ci: CheckInRecord) => ci.workerId === worker.id && new Date(ci.createdAt) >= monthStart).length : 0;
      let earnings: number | null = null, label = "预计收益";
      if (worker.wageType === "daily" && worker.wageRate) { earnings = attendance * worker.wageRate; label = "日薪小计"; }
      else if (worker.wageType === "monthly" && worker.wageRate) { earnings = worker.wageRate; label = "本月月薪"; }
      else if (worker.wageType === "piecework" && worker.wageRate) {
        const approved = Array.isArray(reports) ? reports.filter((r: ReportRecord) => r.status === "verified" && new Date(r.createdAt) >= monthStart) : [];
        earnings = approved.reduce((s: number, r: ReportRecord) => s + (parseFloat(r.qty) || 0) * worker.wageRate!, 0);
        label = "计件产值";
      }
      setStats({ attendance, earnings, label });
    });
  }, [worker]);

  const wageLabels: Record<string, string> = { daily: "日薪", monthly: "月薪", piecework: "计件" };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">我的</h2>

      <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}>{worker.name[0]}</div>
          <div className="flex-1">
            <div className="text-base font-bold text-white">{worker.name}</div>
            <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{worker.project}</div>
            {worker.wageType && worker.wageRate && (
              <div className="text-xs mt-1 font-mono" style={{ color: "var(--accent)" }}>
                {wageLabels[worker.wageType] ?? worker.wageType} ¥{worker.wageRate.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>本月出勤</div>
            <div className="text-3xl font-mono font-bold text-white">{stats.attendance}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>天</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{stats.label}</div>
            <div className="text-2xl font-mono font-bold" style={{ color: stats.earnings !== null ? "var(--green)" : "var(--muted)" }}>
              {stats.earnings !== null ? `¥${stats.earnings.toLocaleString()}` : "--"}
            </div>
          </div>
        </div>
      )}

      <button onClick={onLogout} className="w-full py-4 rounded-2xl text-sm font-medium transition-all active:scale-95" style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
        退出登录
      </button>
    </div>
  );
}

// ─── Tab Bar Config ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    key: "today", label: "今日",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: "report", label: "报量",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    key: "history", label: "记录",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    key: "me", label: "我的",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "var(--accent)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WorkerPage() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    try {
      const s = localStorage.getItem("pl_worker");
      if (s) setWorker(JSON.parse(s));
    } catch {}
  }, []);

  const handleLogin = (w: Worker) => {
    try { localStorage.setItem("pl_worker", JSON.stringify(w)); } catch {}
    setWorker(w);
  };

  const handleLogout = () => {
    try { localStorage.removeItem("pl_worker"); } catch {}
    setWorker(null);
  };

  if (!worker) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col max-w-sm mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span className="text-sm font-bold text-white tracking-tight">PowerLink</span>
        </div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>{worker.name} · {worker.project}</div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {tab === "today"   && <TodayTab worker={worker} />}
        {tab === "report"  && <ReportTab worker={worker} />}
        {tab === "history" && <HistoryTab worker={worker} />}
        {tab === "me"      && <MeTab worker={worker} onLogout={handleLogout} />}
      </div>

      {/* Bottom Tab Bar */}
      <div className="shrink-0 border-t grid grid-cols-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)} className="flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all active:opacity-70">
            {icon(tab === key)}
            <span className="text-[10px] font-medium" style={{ color: tab === key ? "var(--accent)" : "var(--muted)" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
