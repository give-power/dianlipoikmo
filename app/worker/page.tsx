"use client";
import { useState, useEffect } from "react";

type Report = { 工序: string; 规格: string; 数量: string };
type Phase = "login" | "checkin" | "form" | "confirm" | "done";
type Worker = { id: string; name: string; project: string };

type ReportRecord = {
  id: number;
  task: string;
  spec: string;
  qty: string;
  status: string;
  createdAt: string;
  project: string;
};

type CorrectionTarget = {
  reportId: number;
  task: string;
  spec: string;
  qty: string;
};

// ─── Correction Modal ─────────────────────────────────────────────────────────
function CorrectionModal({
  target,
  worker,
  onClose,
}: {
  target: CorrectionTarget;
  worker: Worker;
  onClose: () => void;
}) {
  const [task, setTask] = useState(target.task);
  const [spec, setSpec] = useState(target.spec);
  const [qty, setQty] = useState(target.qty);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: worker.id,
          workerName: worker.name,
          original: `工序:${target.task} 规格:${target.spec} 数量:${target.qty}`,
          corrected: JSON.stringify({ task, spec, qty }),
          reason,
          reportId: target.reportId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "纠偏提交失败，请重试");
        return;
      }
      setDone(true);
    } catch {
      setError("纠偏提交失败，请检查网络连接后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-6">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)", border: "2px solid var(--green)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-base font-semibold text-white mb-1">纠偏申请已提交</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted)" }}>等待负责人确认后生效</div>
            <button className="btn-ghost" onClick={onClose}>关闭</button>
          </div>
        ) : (
          <>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
            <div className="text-base font-semibold text-white mb-4">申请纠偏</div>

            {[
              { label: "工序", value: task, set: setTask },
              { label: "规格", value: spec, set: setSpec },
              { label: "数量", value: qty, set: setQty },
            ].map(({ label, value, set }) => (
              <div key={label} className="mb-3">
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{label}</div>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
            ))}

            <div className="mb-5">
              <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
                纠偏原因 <span style={{ color: "#ef4444" }}>*</span>
              </div>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="说明原因，例如：录入时数量搞错了"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            {error && (
              <div className="mb-3 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!reason.trim() || submitting}
              className="btn-primary w-full py-4 rounded-xl text-base mb-2 disabled:opacity-50"
            >
              {submitting ? "提交中..." : "提交纠偏申请"}
            </button>
            <button className="btn-ghost w-full py-3" onClick={onClose}>取消</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────────────────────
function HistoryView({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [corrTarget, setCorrTarget] = useState<CorrectionTarget | null>(null);

  useEffect(() => {
    fetch(`/api/reports?workerId=${encodeURIComponent(worker.id)}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [worker.id]);

  const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: "待审", color: "var(--amber)", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    approved: { label: "已批", color: "var(--green)", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
    rejected: { label: "驳回", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "var(--bg)" }}>
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: "var(--bg)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <div className="text-sm font-semibold text-white">我的报量记录</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {worker.name} · {worker.project}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex gap-1.5 justify-center py-16">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-sm" style={{ color: "var(--muted)" }}>暂无报量记录</span>
            </div>
          ) : (
            records.map((r) => {
              const s = statusMap[r.status] ?? statusMap.pending;
              return (
                <div key={r.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl text-xs" style={{ background: "var(--bg)" }}>
                    {([["工序", r.task], ["规格", r.spec], ["数量", r.qty]] as [string, string][]).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ color: "var(--muted)" }}>{k}</div>
                        <div className="font-medium text-white mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                  {r.status !== "approved" && (
                    <button
                      onClick={() => setCorrTarget({ reportId: r.id, task: r.task, spec: r.spec, qty: r.qty })}
                      className="mt-3 w-full py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--amber)" }}
                    >
                      申请纠偏
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {corrTarget && (
        <CorrectionModal target={corrTarget} worker={worker} onClose={() => setCorrTarget(null)} />
      )}
    </>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (w: Worker) => void }) {
  const [pin, setPin] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 多人匹配时显示候选列表
  const [candidates, setCandidates] = useState<Worker[] | null>(null);
  // 降级模式：浏览全部工人列表
  const [showList, setShowList] = useState(false);
  const [listWorkers, setListWorkers] = useState<Worker[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const handlePinSubmit = async () => {
    const trimmed = pin.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setCandidates(null);
    try {
      const res = await fetch("/api/workers/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: trimmed }),
      });
      const data = await res.json();
      if (res.ok && !data.multiple) {
        onLogin(data as Worker);
      } else if (data.multiple) {
        setCandidates(data.workers);
      } else {
        setError(data.error ?? "未找到匹配工人");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSearching(false);
    }
  };

  const loadList = () => {
    setShowList(true);
    setListLoading(true);
    fetch("/api/workers")
      .then((r) => r.json())
      .then((data) => { setListWorkers(data); setListLoading(false); })
      .catch(() => setListLoading(false));
  };

  // 降级：全员列表
  if (showList) {
    return (
      <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">选择你的身份</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>点击你的名字继续</p>
        </div>
        {listLoading ? (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-2">
            {listWorkers.map((w) => (
              <button
                key={w.id}
                onClick={() => onLogin(w)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-95"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                  >
                    {w.name[0]}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">{w.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{w.project}</div>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        )}
        <button className="text-xs" style={{ color: "var(--muted)" }} onClick={() => setShowList(false)}>
          ← 返回PIN登录
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">工人登录</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>输入手机后4位 / 身份证后4位</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <input
          type="tel"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(null); setCandidates(null); }}
          onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
          placeholder="输入工号 / 手机后4位"
          className="w-full rounded-2xl px-5 py-4 text-center text-2xl font-mono tracking-[0.4em] outline-none transition-all"
          style={{
            background: "var(--surface)",
            border: `1px solid ${error ? "var(--red, #ef4444)" : "var(--border)"}`,
            color: "var(--text)",
            letterSpacing: pin ? "0.4em" : undefined,
          }}
          autoFocus
        />

        {error && (
          <div className="text-center text-sm px-2" style={{ color: "var(--red, #ef4444)" }}>
            {error}
          </div>
        )}

        {/* 多人匹配：显示候选列表 */}
        {candidates && candidates.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-center" style={{ color: "var(--muted)" }}>找到多个匹配，请选择：</div>
            {candidates.map((w) => (
              <button
                key={w.id}
                onClick={() => onLogin(w)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                >
                  {w.name[0]}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{w.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{w.project}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handlePinSubmit}
          disabled={searching || !pin.trim()}
          className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {searching ? "验证中..." : "确认登录"}
        </button>
      </div>

      <button
        className="text-xs underline-offset-2"
        style={{ color: "var(--muted)" }}
        onClick={loadList}
      >
        找不到自己？浏览工人列表
      </button>
    </div>
  );
}

// ─── Check-In Screen ──────────────────────────────────────────────────────────
type TodayStatus = {
  checkedIn: boolean;
  checkinTime?: string;
  reportCount: number;
  pendingCount: number;
  approvedCount: number;
};

function CheckInScreen({
  worker,
  onCheckIn,
  onViewHistory,
}: {
  worker: Worker;
  onCheckIn: () => void;
  onViewHistory: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      fetch("/api/checkin").then((r) => r.json()).catch(() => []),
      fetch(`/api/reports?workerId=${encodeURIComponent(worker.id)}`).then((r) => r.json()).catch(() => []),
    ]).then(([checkins, reports]) => {
      const myCheckin = Array.isArray(checkins)
        ? checkins.find(
            (ci: { workerId: string; createdAt: string }) =>
              ci.workerId === worker.id && new Date(ci.createdAt) >= todayStart
          )
        : null;
      const todayReports = Array.isArray(reports)
        ? reports.filter((r: { createdAt: string }) => new Date(r.createdAt) >= todayStart)
        : [];
      const d = myCheckin ? new Date(myCheckin.createdAt) : null;
      setTodayStatus({
        checkedIn: !!myCheckin,
        checkinTime: d
          ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
          : undefined,
        reportCount: todayReports.length,
        pendingCount: todayReports.filter((r: { status: string }) => r.status === "pending").length,
        approvedCount: todayReports.filter((r: { status: string }) => r.status === "approved").length,
      });
    });
  }, [worker.id]);

  const handleCheckIn = async () => {
    setChecking(true);
    setError(null);
    try {
      // 尝试获取 GPS（不阻塞，超时 5s 降级为手动打卡）
      let gpsLat: number | null = null;
      let gpsLng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, maximumAge: 30000 });
        });
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
      } catch { /* GPS 不可用，继续手动打卡 */ }

      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id, project: worker.project, gpsLat, gpsLng }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "打卡失败，请重试");
        return;
      }
      onCheckIn();
    } catch {
      setError("打卡失败，请检查网络连接后重试");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{worker.name}</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{worker.project} · {worker.id}</p>
      </div>

      {todayStatus && (
        <div
          className="w-full max-w-xs rounded-2xl px-4 py-3.5"
          style={
            todayStatus.checkedIn
              ? { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.22)" }
              : { background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: todayStatus.checkedIn ? "var(--green)" : "var(--muted)" }} />
            <span className="text-xs font-medium" style={{ color: todayStatus.checkedIn ? "var(--green)" : "var(--muted)" }}>
              {todayStatus.checkedIn ? `今天 ${todayStatus.checkinTime} 已打卡` : "今天尚未打卡"}
            </span>
          </div>
          {todayStatus.reportCount > 0 ? (
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              今日报量 {todayStatus.reportCount} 条
              {todayStatus.approvedCount > 0 && <span style={{ color: "var(--green)" }}> · {todayStatus.approvedCount} 条已批</span>}
              {todayStatus.pendingCount > 0 && <span style={{ color: "var(--amber)" }}> · {todayStatus.pendingCount} 条待审</span>}
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--muted)" }}>今日暂无报量记录</div>
          )}
        </div>
      )}

      <div className="w-full max-w-xs space-y-3">
        {error && (
          <div className="px-3 py-2.5 rounded-xl text-xs text-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            {error}
          </div>
        )}
        <button
          onClick={handleCheckIn}
          disabled={checking}
          className="w-full py-5 rounded-2xl text-base font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            boxShadow: "0 0 32px rgba(16,185,129,0.35)",
          }}
        >
          {checking ? "打卡中..." : "进场打卡"}
        </button>
        <button
          onClick={onViewHistory}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          查看历史记录
        </button>
      </div>
    </div>
  );
}

// ─── Manual Report Form ───────────────────────────────────────────────────────
const TASK_PRESETS = ["穿线管", "接线盒", "配电箱", "布线", "接线", "桥架", "开关插座", "灯具安装"];

function ManualReportForm({
  worker,
  checkInTime,
  onSubmit,
  onViewHistory,
}: {
  worker: Worker;
  checkInTime: string;
  onSubmit: (report: Report) => void;
  onViewHistory: () => void;
}) {
  const [task, setTask] = useState("");
  const [spec, setSpec] = useState("");
  const [qty, setQty] = useState("");

  const canSubmit = task.trim() && qty.trim();

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div>
          <div className="font-semibold text-white text-sm">{worker.name}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {worker.project} · 打卡 {checkInTime}
          </div>
        </div>
        <button
          onClick={onViewHistory}
          className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
          style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          记录
        </button>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">填写今日报量</h2>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          填完点提交，管理员审核后生效
        </p>

        {/* 工序 */}
        <div className="mb-5">
          <div className="text-sm mb-2 flex items-center gap-1" style={{ color: "var(--muted)" }}>
            工序 <span style={{ color: "#ef4444" }}>*</span>
          </div>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="例：穿线管、接线盒安装"
            className="w-full rounded-2xl px-4 py-3.5 text-base outline-none mb-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          {/* Preset chips */}
          <div className="flex flex-wrap gap-2">
            {TASK_PRESETS.map((t) => (
              <button
                key={t}
                onClick={() => setTask(t)}
                className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={{
                  background: task === t ? "rgba(59,130,246,0.2)" : "var(--surface)",
                  border: `1px solid ${task === t ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                  color: task === t ? "var(--accent)" : "var(--muted)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 规格 */}
        <div className="mb-5">
          <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>规格（选填）</div>
          <input
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            placeholder="例：DN20、BV4mm²、86型"
            className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>

        {/* 数量 */}
        <div className="mb-8">
          <div className="text-sm mb-2 flex items-center gap-1" style={{ color: "var(--muted)" }}>
            数量 <span style={{ color: "#ef4444" }}>*</span>
          </div>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="例：50m、30个、2套"
            className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>

        <button
          onClick={() =>
            onSubmit({ 工序: task.trim(), 规格: spec.trim() || "—", 数量: qty.trim() })
          }
          disabled={!canSubmit}
          className="w-full py-5 rounded-2xl text-base font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            boxShadow: "0 0 32px rgba(59,130,246,0.3)",
          }}
        >
          下一步，确认提交
        </button>
      </div>
    </div>
  );
}

// ─── Done Screen ──────────────────────────────────────────────────────────────
function DoneScreen({
  worker,
  checkInTime,
  report,
  onMore,
  onViewHistory,
}: {
  worker: Worker;
  checkInTime: string;
  report: Report | null;
  onMore: () => void;
  onViewHistory: () => void;
}) {
  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-6 px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "rgba(16,185,129,0.15)", border: "2px solid var(--green)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">报量已提交</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {worker.name} · 打卡时间 {checkInTime}
        </p>
      </div>
      {report && (
        <div className="glass rounded-2xl p-5 w-full max-w-sm">
          {(Object.entries(report) as [string, string][]).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between items-center py-2.5 border-b text-sm"
              style={{ borderColor: "rgba(59,130,246,0.08)" }}
            >
              <span style={{ color: "var(--muted)" }}>{k}</span>
              <span className="text-white font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}
      <div className="w-full max-w-sm space-y-2.5">
        <button
          onClick={onMore}
          className="btn-primary w-full py-4 rounded-2xl text-base"
        >
          继续报量
        </button>
        <button
          onClick={onViewHistory}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          查看全部记录
        </button>
      </div>
    </div>
  );
}

// ─── Main Worker Page ─────────────────────────────────────────────────────────
export default function WorkerPage() {
  const [phase, setPhase] = useState<Phase>("login");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restore identity from localStorage + verify worker still exists in DB (RH1)
  useEffect(() => {
    const saved = localStorage.getItem("pl_worker");
    if (!saved) return;
    try {
      const w: Worker = JSON.parse(saved);
      fetch(`/api/workers/${encodeURIComponent(w.id)}`)
        .then((r) => {
          if (r.ok) return r.json().then((fresh: Worker) => { setWorker(fresh); });
          else localStorage.removeItem("pl_worker"); // worker deleted — force re-login
        })
        .catch(() => setWorker(w)); // network error — allow cached identity
    } catch { /* ignore */ }
  }, []);

  const handleLogin = (w: Worker) => {
    setWorker(w);
    localStorage.setItem("pl_worker", JSON.stringify(w));
    setPhase("checkin");
  };

  const doCheckIn = () => {
    const now = new Date();
    setCheckInTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setPhase("form");
  };

  const handleFormSubmit = (r: Report) => {
    setReport(r);
    setPhase("confirm");
  };

  const handlePhotoUpload = async (files: FileList) => {
    setUploading(true);
    setSubmitError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setSubmitError(err.error ?? "照片上传失败，请重试");
          return;
        }
        const data = await res.json();
        if (data.path) uploaded.push(data.path);
      }
      setPhotoUrls((prev) => [...prev, ...uploaded]);
    } catch {
      setSubmitError("照片上传失败，请检查网络连接");
    } finally {
      setUploading(false);
    }
  };

  const submitReport = async () => {
    if (!report || !worker) return;
    setSubmitError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: worker.id,
          workerName: worker.name,
          project: worker.project,
          task: report.工序,
          spec: report.规格,
          qty: report.数量,
          photoUrls,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.error ?? "报量提交失败，请重试");
        return;
      }
      setPhase("done");
    } catch {
      setSubmitError("报量提交失败，请检查网络连接后重试");
    }
  };

  const resetToForm = () => {
    setReport(null);
    setPhotoUrls([]);
    setPhase("form");
  };

  // History overlay
  if (showHistory && worker) {
    return <HistoryView worker={worker} onClose={() => setShowHistory(false)} />;
  }

  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  if (!worker) return null;

  if (phase === "checkin") {
    return (
      <CheckInScreen
        worker={worker}
        onCheckIn={doCheckIn}
        onViewHistory={() => setShowHistory(true)}
      />
    );
  }

  if (phase === "form") {
    return (
      <ManualReportForm
        worker={worker}
        checkInTime={checkInTime}
        onSubmit={handleFormSubmit}
        onViewHistory={() => setShowHistory(true)}
      />
    );
  }

  if (phase === "done") {
    return (
      <DoneScreen
        worker={worker}
        checkInTime={checkInTime}
        report={report}
        onMore={resetToForm}
        onViewHistory={() => setShowHistory(true)}
      />
    );
  }

  // ─── Confirm phase ────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <button
          onClick={() => setPhase("form")}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          返回修改
        </button>
        <div className="text-sm font-semibold text-white">确认报量</div>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col">
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>请核对信息后提交</p>

        {/* Report summary */}
        {report && (
          <div className="glass rounded-2xl p-5 mb-4">
            {(Object.entries(report) as [string, string][]).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between items-center py-3 border-b text-sm"
                style={{ borderColor: "rgba(59,130,246,0.08)" }}
              >
                <span style={{ color: "var(--muted)" }}>{k}</span>
                <span className="text-white font-semibold">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Photo upload */}
        <div className="mb-5 space-y-2">
          <label
            className="flex items-center justify-center gap-2 py-4 rounded-xl cursor-pointer text-sm transition-all"
            style={{
              border: photoUrls.length > 0 ? "1px solid rgba(16,185,129,0.35)" : "1px dashed rgba(59,130,246,0.25)",
              color: photoUrls.length > 0 ? "var(--green)" : "var(--muted)",
              background: photoUrls.length > 0 ? "rgba(16,185,129,0.06)" : "transparent",
            }}
          >
            {uploading ? (
              <span className="animate-pulse">上传中...</span>
            ) : photoUrls.length > 0 ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                已上传 {photoUrls.length} 张
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-mono" style={{ background: "rgba(16,185,129,0.15)", color: "var(--green)" }}>
                  +继续添加
                </span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                拍照存证（选填，可多张）
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handlePhotoUpload(e.target.files); }}
            />
          </label>
          {photoUrls.length > 0 && (
            <button
              onClick={() => setPhotoUrls([])}
              className="text-xs w-full text-center py-1"
              style={{ color: "var(--muted)" }}
            >
              清除全部照片
            </button>
          )}
        </div>

        {submitError && (
          <div className="mb-3 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            {submitError}
          </div>
        )}
        <button
          className="btn-primary w-full py-4 text-base rounded-xl mb-2"
          onClick={submitReport}
        >
          确认提交
        </button>
        <button
          className="btn-ghost w-full py-3"
          onClick={resetToForm}
        >
          重新填写
        </button>
      </div>
    </div>
  );
}
