"use client";
import { useState, useEffect } from "react";

interface CheckIn {
  id: number;
  workerId: string;
  project: string;
  createdAt: string;
}

interface Report {
  id: number;
  status: string;
  createdAt: string;
}

interface Project {
  budget: number;
  spent: number;
  profitRate: number;
  status: string;
}

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export default function AnnualPage() {
  const currentYear = new Date().getFullYear();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/checkin?year=${currentYear}`).then((r) => r.json()),
      fetch(`/api/reports?year=${currentYear}&limit=2000`).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ])
      .then(([ci, rp, proj]) => {
        setCheckins(Array.isArray(ci) ? ci : []);
        setReports(Array.isArray(rp) ? rp : []);
        setProjects(Array.isArray(proj) ? proj : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentYear]);

  // Aggregate worker-days per month
  const monthWorkerDays = MONTH_LABELS.map((_, i) =>
    checkins.filter((ci) => new Date(ci.createdAt).getUTCMonth() === i).length
  );

  // Aggregate approved reports per month
  const monthApproved = MONTH_LABELS.map((_, i) =>
    reports.filter(
      (r) => r.status === "approved" && new Date(r.createdAt).getUTCMonth() === i
    ).length
  );

  const maxWorkerDays = Math.max(...monthWorkerDays, 1);

  // Annual totals from projects
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const avgProfitRate =
    projects.length > 0
      ? projects.reduce((s, p) => s + p.profitRate, 0) / projects.length
      : 0;
  const impliedProfit = totalSpent * (avgProfitRate / 100);

  const totalWorkerDays = checkins.length;
  const totalApproved = reports.filter((r) => r.status === "approved").length;

  const annual = [
    { label: "年度累计产值", value: totalSpent > 0 ? `¥${(totalSpent / 10000).toFixed(1)}万` : "—", color: "var(--accent)" },
    { label: "年度预估利润", value: impliedProfit > 0 ? `¥${(impliedProfit / 10000).toFixed(1)}万` : "—", color: "var(--green)" },
    { label: "综合利润率", value: avgProfitRate > 0 ? `${avgProfitRate.toFixed(1)}%` : "—", color: "var(--green)" },
    { label: "累计工人工日", value: `${totalWorkerDays} 工日`, color: "var(--text)" },
  ];

  return (
    <div className="min-h-[100dvh] grid-bg">
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">年度汇总</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {currentYear}年度 · {activeProjects} 个在施项目 · 截至今日
          </p>
        </div>
        <button className="btn-primary">导出年报</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="px-8 py-6 space-y-5">
          {/* 年度指标 */}
          <div className="grid grid-cols-4 gap-4">
            {annual.map((a) => (
              <div key={a.label} className="glass-sm rounded-xl p-5">
                <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{a.label}</div>
                <div className="text-xl font-mono font-bold" style={{ color: a.color }}>{a.value}</div>
              </div>
            ))}
          </div>

          {/* 月度工人工日柱状图 */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium text-white">月度工人工日趋势</h2>
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                共 {totalWorkerDays} 工日
              </span>
            </div>
            <div className="flex items-end gap-3 h-40">
              {MONTH_LABELS.map((label, i) => {
                const days = monthWorkerDays[i];
                const approved = monthApproved[i];
                const h = Math.round((days / maxWorkerDays) * 100);
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-[10px] font-mono" style={{ color: "var(--green)" }}>
                      {days > 0 ? days : "—"}
                    </div>
                    <div className="w-full flex items-end" style={{ height: "100px" }}>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${h}%`,
                          minHeight: days > 0 ? "4px" : "0",
                          background: "linear-gradient(180deg, var(--accent), rgba(59,130,246,0.3))",
                        }}
                      />
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>{label}</div>
                    {approved > 0 && (
                      <div className="text-[9px] font-mono" style={{ color: "var(--amber)" }}>
                        {approved}报
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] mt-4" style={{ color: "var(--muted)" }}>
              柱高 = 工人工日数（打卡次数） · 橙色标注 = 当月已批报量条数
            </p>
          </div>

          {/* 项目汇总 */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-white mb-4">项目预算汇总</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "项目总数", value: String(projects.length), color: "var(--text)" },
                { label: "总预算", value: `¥${(totalBudget / 10000).toFixed(1)}万`, color: "var(--accent)" },
                { label: "累计已用", value: `¥${(totalSpent / 10000).toFixed(1)}万`, color: "var(--amber)" },
                { label: "已批报量", value: `${totalApproved} 条`, color: "var(--green)" },
                { label: "总工人工日", value: `${totalWorkerDays} 工日`, color: "var(--text)" },
                { label: "在施项目", value: `${activeProjects} 个`, color: "var(--green)" },
              ].map((item) => (
                <div key={item.label} className="glass-sm rounded-lg p-4">
                  <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{item.label}</div>
                  <div className="text-lg font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
