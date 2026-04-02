"use client";
import { useState, useEffect, useCallback } from "react";

interface Project {
  id: number;
  name: string;
  code: string;
  budget: number;
  spent: number;
  profitRate: number;
  status: string;
  createdAt: string;
}

interface CheckIn {
  workerId: string;
  project: string;
}

// Map DB status values to display labels (RC3)
const STATUS_LABEL: Record<string, string> = {
  active: "施工中",
  pending: "待开工",
  completed: "已完工",
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  施工中: { bg: "rgba(16,185,129,0.12)", color: "var(--green)" },
  待开工: { bg: "rgba(245,158,11,0.12)", color: "var(--amber)" },
  已完工: { bg: "rgba(59,130,246,0.12)", color: "var(--accent)" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [projData, ciData] = await Promise.all([
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/checkin").then((r) => r.json()),
      ]);
      setProjects(Array.isArray(projData) ? projData : []);
      setCheckins(Array.isArray(ciData) ? ciData : []);
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
          <h1 className="text-lg font-semibold text-white tracking-tight">项目管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "加载中..." : `共 ${projects.length} 个项目`}
          </p>
        </div>
        <button className="btn-primary">+ 新建项目</button>
      </div>

      <div className="px-8 py-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无项目记录</span>
          </div>
        ) : (
          projects.map((p) => {
            const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
            const uniqueWorkers = new Set(
              checkins.filter((ci) => ci.project === p.name).map((ci) => ci.workerId)
            );
            const liveWorkers = uniqueWorkers.size;
            const statusLabel = STATUS_LABEL[p.status] ?? p.status;
            const s = STATUS_STYLE[statusLabel] ?? STATUS_STYLE["已完工"];
            const startDate = new Date(p.createdAt).toISOString().slice(0, 10);

            return (
              <div
                key={p.id}
                className="glass rounded-xl p-5 flex items-center gap-6 cursor-pointer transition-all"
                style={{
                  borderLeft:
                    p.status === "active"
                      ? "2px solid var(--accent)"
                      : "2px solid var(--border)",
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-white">{p.name}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                      {p.code}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    建档 {startDate} ·{" "}
                    {loading ? (
                      "—"
                    ) : liveWorkers > 0 ? (
                      <span style={{ color: "var(--green)" }}>{liveWorkers} 人今日在场</span>
                    ) : (
                      "今日暂无打卡"
                    )}
                    {p.profitRate > 0 && (
                      <span style={{ color: "var(--muted)" }}> · 利润率 {p.profitRate}%</span>
                    )}
                  </div>
                </div>
                <div className="w-40">
                  <div
                    className="flex justify-between text-[11px] font-mono mb-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    <span>预算进度</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: "linear-gradient(90deg, var(--accent), #60a5fa)",
                      }}
                    />
                  </div>
                  <div className="text-[11px] font-mono mt-1" style={{ color: "var(--muted)" }}>
                    ¥{(p.spent / 10000).toFixed(1)}万 / ¥{(p.budget / 10000).toFixed(0)}万
                  </div>
                </div>
                <div className="text-right">
                  <button className="btn-ghost text-xs">查看详情</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
