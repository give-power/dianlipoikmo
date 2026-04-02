"use client";
import { useState, useEffect, useCallback } from "react";

interface CheckIn {
  id: number;
  workerId: string;
  project: string;
  createdAt: string;
  worker: { name: string };
}

interface Report {
  id: number;
  workerName: string;
  project: string;
  task: string;
  spec: string;
  qty: string;
  status: string;
  createdAt: string;
}

interface Visa {
  id: number;
  title: string;
  amount: number;
  status: string;
}

interface Correction {
  id: number;
  workerName: string;
  status: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
  budget: number;
  spent: number;
  profitRate: number;
  status: string;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtUpdated(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} 更新`;
}

function isToday(iso: string) {
  const now = new Date();
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const TODAY = new Date();
const DAYS = ["日", "一", "二", "三", "四", "五", "六"];
const TODAY_STR = `${TODAY.getFullYear()}年${TODAY.getMonth() + 1}月${TODAY.getDate()}日 星期${DAYS[TODAY.getDay()]}`;

export default function DashboardPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ci, rp, vs, co, pr] = await Promise.all([
        fetch("/api/checkin").then((r) => r.json()),
        fetch("/api/reports").then((r) => r.json()),
        fetch("/api/visas").then((r) => r.json()),
        fetch("/api/corrections").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);
      setCheckins(Array.isArray(ci) ? ci : []);
      setReports(Array.isArray(rp) ? rp : []);
      setVisas(Array.isArray(vs) ? vs : []);
      setCorrections(Array.isArray(co) ? co : []);
      setProjects(Array.isArray(pr) ? pr : []);
      setUpdatedAt(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Derived data
  const todayReports = reports.filter((r) => isToday(r.createdAt));
  const pendingReports = todayReports.filter((r) => r.status === "pending");
  const pendingVisas = visas.filter((v) => v.status === "pending");
  const pendingVisaTotal = pendingVisas.reduce((s, v) => s + v.amount, 0);
  const pendingCorrections = corrections.filter((c) => c.status === "pending");
  const activeProjects = projects.filter((p) => p.status === "active");
  const avgProfitRate =
    projects.length > 0
      ? projects.reduce((s, p) => s + p.profitRate, 0) / projects.length
      : 0;

  const recentLogs = [...todayReports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // Dynamic alerts from real data
  const alerts: Array<{ warn: boolean; msg: string; action: string }> = [];
  if (pendingVisas.length > 0) {
    alerts.push({
      warn: true,
      msg: `${pendingVisas.length}项合同外签证待确认，涉及金额 ¥${pendingVisaTotal.toLocaleString()}`,
      action: "前往确认",
    });
  }
  if (pendingCorrections.length > 0) {
    alerts.push({
      warn: false,
      msg: `${pendingCorrections.length}项纠偏申请待确认，请及时处理`,
      action: "前往确认",
    });
  }
  if (!loading && alerts.length === 0) {
    alerts.push({ warn: false, msg: "暂无风险预警，项目进展正常", action: "" });
  }

  // Workers shown in header of stat card
  const checkinNames = checkins
    .slice(0, 3)
    .map((c) => c.worker?.name ?? "")
    .filter(Boolean);
  const checkinLabel =
    checkinNames.length === 0
      ? "暂无打卡"
      : checkinNames.join("、") + (checkins.length > 3 ? ` 等${checkins.length}人` : "");

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* TopBar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{
          background: "rgba(7,13,26,0.85)",
          borderColor: "var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">今日看板</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "加载中..." : updatedAt ? `${TODAY_STR} · ${fmtUpdated(updatedAt)}` : TODAY_STR}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          ) : (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--green)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--green)" }}
              />
              实时
            </div>
          )}
          <button className="btn-ghost" onClick={fetchAll}>
            刷新数据
          </button>
          <button className="btn-primary">导出日报</button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          {/* 今日在场 */}
          <div className="glass-sm rounded-xl p-5">
            <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>今日在场</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-white">
                {loading ? "—" : checkins.length}
              </span>
              <span className="text-sm" style={{ color: "var(--muted)" }}>人</span>
            </div>
            <div className="mt-2 text-xs font-mono truncate" style={{ color: "var(--green)" }}>
              {loading ? "" : checkinLabel}
            </div>
            <div
              className="mt-3 h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--green), transparent)" }}
            />
          </div>

          {/* 今日报量 */}
          <div className="glass-sm rounded-xl p-5">
            <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>今日报量</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-white">
                {loading ? "—" : todayReports.length}
              </span>
              <span className="text-sm" style={{ color: "var(--muted)" }}>条</span>
            </div>
            <div
              className="mt-2 text-xs font-mono"
              style={{ color: pendingReports.length > 0 ? "var(--amber)" : "var(--green)" }}
            >
              {loading ? "" : pendingReports.length > 0
                ? `${pendingReports.length} 条待审核`
                : "全部已审核"}
            </div>
            <div
              className="mt-3 h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }}
            />
          </div>

          {/* 综合利润率 — from project data */}
          <div className="glass-sm rounded-xl p-5">
            <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>综合利润率</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-white">
                {loading || projects.length === 0 ? "—" : avgProfitRate.toFixed(1)}
              </span>
              {!loading && projects.length > 0 && (
                <span className="text-sm" style={{ color: "var(--muted)" }}>%</span>
              )}
            </div>
            <div className="mt-2 text-xs font-mono" style={{ color: "var(--green)" }}>
              {loading ? "" : `${activeProjects.length} 个在施项目`}
            </div>
            <div
              className="mt-3 h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--green), transparent)" }}
            />
          </div>

          {/* 待确认签证 */}
          <div className="glass-sm rounded-xl p-5">
            <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>待确认签证</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-white">
                {loading ? "—" : pendingVisas.length}
              </span>
              <span className="text-sm" style={{ color: "var(--muted)" }}>项</span>
            </div>
            <div
              className="mt-2 text-xs font-mono"
              style={{ color: pendingVisas.length > 0 ? "var(--amber)" : "var(--muted)" }}
            >
              {loading
                ? ""
                : pendingVisas.length > 0
                ? `涉及 ¥${pendingVisaTotal.toLocaleString()}`
                : "暂无待确认"}
            </div>
            <div
              className="mt-3 h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--amber), transparent)" }}
            />
          </div>
        </div>

        {/* Projects + Alerts */}
        <div className="grid grid-cols-3 gap-5">
          {/* Projects */}
          <div className="col-span-2 glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-white text-sm">在施项目</h2>
              <a href="/projects" className="btn-ghost text-xs">管理项目</a>
            </div>
            <div className="space-y-4">
              {!loading && activeProjects.length === 0 && (
                <div className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>
                  暂无在施项目，前往项目管理添加
                </div>
              )}
              {activeProjects.map((p) => {
                const pct = p.budget > 0 ? Math.min(Math.round((p.spent / p.budget) * 100), 100) : 0;
                const uniqueWorkers = new Set(
                  checkins.filter((ci) => ci.project === p.name).map((ci) => ci.workerId)
                );
                const projectWorkerCount = uniqueWorkers.size;
                const projectReportCount = todayReports.filter(
                  (r) => r.project === p.name
                ).length;
                return (
                  <div key={p.id} className="glass-sm rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{p.name}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                            style={{
                              background: "rgba(16,185,129,0.12)",
                              color: "var(--green)",
                            }}
                          >
                            施工中
                          </span>
                        </div>
                        <div
                          className="text-[11px] mt-0.5 font-mono"
                          style={{ color: "var(--muted)" }}
                        >
                          {p.code} · {loading ? "—" : projectWorkerCount}人在场 · 今日{loading ? "—" : projectReportCount}条报量
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                          利润率
                        </div>
                        <div
                          className="text-sm font-mono font-semibold"
                          style={{ color: "var(--green)" }}
                        >
                          {p.profitRate > 0 ? `${p.profitRate}%` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="flex-1 h-1.5 rounded-full"
                        style={{ background: "var(--surface2)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 90
                              ? "linear-gradient(90deg, #ef4444, #f87171)"
                              : "linear-gradient(90deg, var(--accent), #60a5fa)",
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-mono w-8 text-right"
                        style={{ color: pct >= 90 ? "#ef4444" : "var(--muted)" }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-[11px] font-mono"
                      style={{ color: "var(--muted)" }}
                    >
                      <span>
                        已用 ¥{(p.spent / 10000).toFixed(1)}万 / 预算 ¥
                        {(p.budget / 10000).toFixed(0)}万
                      </span>
                      <span style={{ color: pct >= 90 ? "#ef4444" : "var(--accent)" }}>进度 {pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-white text-sm">风险预警</h2>
              {!loading && alerts.filter((a) => a.warn).length > 0 && (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)" }}
                >
                  {alerts.filter((a) => a.warn).length} 项
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div
                  className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3.5"
                    style={{
                      background: a.warn
                        ? "rgba(245,158,11,0.06)"
                        : "rgba(59,130,246,0.06)",
                      borderLeft: `2px solid ${a.warn ? "var(--amber)" : "var(--accent)"}`,
                    }}
                  >
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                      {a.msg}
                    </p>
                    {a.action && (
                      <button
                        className="text-xs mt-2 font-medium"
                        style={{ color: a.warn ? "var(--amber)" : "var(--accent)" }}
                      >
                        {a.action} →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-medium text-white text-sm">今日报量记录</h2>
            <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
              {!loading && `共 ${todayReports.length} 条`}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
              />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--muted)" }}>
              暂无今日报量记录
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr
                  className="text-left border-b text-xs"
                  style={{ color: "var(--muted)", borderColor: "var(--border)" }}
                >
                  <th className="pb-3 font-normal w-14">时间</th>
                  <th className="pb-3 font-normal w-16">工人</th>
                  <th className="pb-3 font-normal">工序</th>
                  <th className="pb-3 font-normal w-32">规格 / 工量</th>
                  <th className="pb-3 font-normal text-right w-16">项目</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((r) => (
                  <tr
                    key={r.id}
                    className="text-xs border-t"
                    style={{ borderColor: "rgba(59,130,246,0.08)" }}
                  >
                    <td className="py-3 font-mono" style={{ color: "var(--muted)" }}>
                      {fmtTime(r.createdAt)}
                    </td>
                    <td className="py-3 text-white">{r.workerName}</td>
                    <td className="py-3" style={{ color: "var(--text)" }}>
                      {r.task}
                    </td>
                    <td className="py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>
                      {r.spec} {r.qty}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono"
                        style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}
                      >
                        {r.project.slice(0, 2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
