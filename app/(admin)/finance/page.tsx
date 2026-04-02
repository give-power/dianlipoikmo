"use client";
import { useState, useEffect } from "react";

interface Project {
  id: number;
  name: string;
  code: string;
  budget: number;
  spent: number;
  profitRate: number;
  status: string;
}

export default function FinancePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgProfitRate =
    projects.length > 0
      ? projects.reduce((s, p) => s + p.profitRate, 0) / projects.length
      : 0;
  const impliedProfit = projects.reduce(
    (s, p) => s + p.spent * (p.profitRate / 100),
    0
  );
  const budgetUsagePct =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const summary = [
    {
      label: "累计已用产值",
      value: totalSpent > 0 ? `¥${(totalSpent / 10000).toFixed(1)}万` : "—",
      color: "var(--accent)",
    },
    {
      label: "预估总利润",
      value:
        impliedProfit > 0 ? `¥${(impliedProfit / 10000).toFixed(1)}万` : "—",
      color: "var(--green)",
    },
    {
      label: "综合利润率",
      value: avgProfitRate > 0 ? `${avgProfitRate.toFixed(1)}%` : "—",
      color: "var(--green)",
    },
    {
      label: "预算总额",
      value: totalBudget > 0 ? `¥${(totalBudget / 10000).toFixed(1)}万` : "—",
      color: "var(--text)",
    },
    {
      label: "预算使用率",
      value: totalBudget > 0 ? `${budgetUsagePct}%` : "—",
      color: budgetUsagePct > 90 ? "#ef4444" : "var(--amber)",
    },
    {
      label: "项目总数",
      value: `${projects.length} 个`,
      color: "var(--text)",
    },
  ];

  return (
    <div className="min-h-[100dvh] grid-bg">
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{
          background: "rgba(7,13,26,0.85)",
          borderColor: "var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            财务核算
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading
              ? "加载中..."
              : `${projects.length} 个项目 · 实时盈亏`}
          </p>
        </div>
        <button className="btn-primary">导出报表</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      ) : (
        <div className="px-8 py-6 space-y-5">
          {/* 盈亏汇总 */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-white mb-4">
              总体盈亏汇总
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {summary.map((s) => (
                <div key={s.label} className="glass-sm rounded-lg p-4">
                  <div
                    className="text-xs mb-2"
                    style={{ color: "var(--muted)" }}
                  >
                    {s.label}
                  </div>
                  <div
                    className="text-xl font-mono font-bold"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 利润公式 */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-white mb-4">
              利润计算说明
            </h2>
            <div
              className="font-mono text-sm p-4 rounded-lg"
              style={{ background: "var(--surface2)", color: "var(--text)" }}
            >
              预估利润 = Σ（各项目已用产值 × 利润率）
            </div>
            {impliedProfit > 0 && (
              <div
                className="mt-3 font-mono text-sm"
                style={{ color: "var(--green)" }}
              >
                ¥{(impliedProfit / 10000).toFixed(1)}万 ≈ ¥
                {(totalSpent / 10000).toFixed(1)}万 × {avgProfitRate.toFixed(1)}
                %（加权均值）
              </div>
            )}
          </div>

          {/* 项目财务明细 */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-white mb-4">
              项目财务明细
            </h2>
            {projects.length === 0 ? (
              <div
                className="text-sm text-center py-6"
                style={{ color: "var(--muted)" }}
              >
                暂无项目数据
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-xs text-left border-b"
                    style={{
                      color: "var(--muted)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <th className="pb-3 font-normal">项目名称</th>
                    <th className="pb-3 font-normal text-right">预算</th>
                    <th className="pb-3 font-normal text-right">已用 / 进度</th>
                    <th className="pb-3 font-normal text-right">利润率</th>
                    <th className="pb-3 font-normal text-right">预估利润</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const profit = p.spent * (p.profitRate / 100);
                    const pct =
                      p.budget > 0
                        ? Math.round((p.spent / p.budget) * 100)
                        : 0;
                    return (
                      <tr
                        key={p.id}
                        className="text-xs border-t"
                        style={{ borderColor: "rgba(59,130,246,0.08)" }}
                      >
                        <td className="py-3">
                          <div className="font-medium text-white">{p.name}</div>
                          <div
                            className="font-mono mt-0.5"
                            style={{ color: "var(--muted)" }}
                          >
                            {p.code}
                          </div>
                        </td>
                        <td
                          className="py-3 font-mono text-right"
                          style={{ color: "var(--muted)" }}
                        >
                          ¥{(p.budget / 10000).toFixed(0)}万
                        </td>
                        <td className="py-3 font-mono text-right">
                          <div style={{ color: "var(--amber)" }}>
                            ¥{(p.spent / 10000).toFixed(1)}万
                          </div>
                          <div
                            style={{
                              color:
                                pct > 90 ? "#ef4444" : "var(--muted)",
                            }}
                          >
                            {pct}%
                          </div>
                        </td>
                        <td
                          className="py-3 font-mono text-right"
                          style={{ color: "var(--green)" }}
                        >
                          {p.profitRate > 0 ? `${p.profitRate}%` : "—"}
                        </td>
                        <td
                          className="py-3 font-mono text-right"
                          style={{
                            color:
                              profit > 0 ? "var(--green)" : "var(--muted)",
                          }}
                        >
                          {profit > 0
                            ? `¥${(profit / 10000).toFixed(1)}万`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                {projects.length > 1 && (
                  <tfoot>
                    <tr
                      className="text-xs border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td
                        className="pt-3 font-medium"
                        style={{ color: "var(--muted)" }}
                      >
                        合计
                      </td>
                      <td
                        className="pt-3 font-mono text-right font-medium text-white"
                      >
                        ¥{(totalBudget / 10000).toFixed(0)}万
                      </td>
                      <td
                        className="pt-3 font-mono text-right font-medium"
                        style={{ color: "var(--amber)" }}
                      >
                        ¥{(totalSpent / 10000).toFixed(1)}万
                      </td>
                      <td
                        className="pt-3 font-mono text-right font-medium"
                        style={{ color: "var(--green)" }}
                      >
                        {avgProfitRate.toFixed(1)}%
                      </td>
                      <td
                        className="pt-3 font-mono text-right font-medium"
                        style={{ color: "var(--green)" }}
                      >
                        ¥{(impliedProfit / 10000).toFixed(1)}万
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
