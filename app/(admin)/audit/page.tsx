"use client";
import { useState, useEffect } from "react";

interface AuditLog {
  id: number;
  tableName: string;
  recordId: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  operatorId: string;
  action: string;
  createdAt: string;
}

const TABLE_COLORS: Record<string, string> = {
  Report:     "var(--accent)",
  Visa:       "var(--amber)",
  Correction: "#a78bfa",
  Project:    "var(--green)",
  CheckIn:    "#f472b6",
  Equipment:  "#fb923c",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState("all");

  useEffect(() => {
    const url = filterTable === "all" ? "/api/audit?limit=200" : `/api/audit?table=${filterTable}&limit=200`;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [filterTable]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  };

  const tables = ["all", "Report", "Visa", "Correction", "Project", "CheckIn", "Equipment"];

  return (
    <div className="min-h-[100dvh] grid-bg">
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">审计追踪</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>所有数据修改记录，防篡改</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {tables.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTable(t)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: filterTable === t ? "rgba(59,130,246,0.2)" : "var(--surface)",
                border: `1px solid ${filterTable === t ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                color: filterTable === t ? "var(--accent)" : "var(--muted)",
              }}
            >
              {t === "all" ? "全部" : t}
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
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>暂无审计记录</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const color = TABLE_COLORS[log.tableName] ?? "var(--muted)";
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-xl px-4 py-3"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {/* Table badge */}
                  <span
                    className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded mt-0.5"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                  >
                    {log.tableName}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white font-medium">
                        #{log.recordId} · {log.field}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                        {log.action}
                      </span>
                    </div>
                    {(log.oldValue !== null || log.newValue !== null) && (
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        {log.oldValue !== null && (
                          <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                            {log.oldValue}
                          </span>
                        )}
                        {log.oldValue !== null && log.newValue !== null && (
                          <span style={{ color: "var(--muted)" }}>→</span>
                        )}
                        {log.newValue !== null && (
                          <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(16,185,129,0.1)", color: "var(--green)" }}>
                            {log.newValue}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>{fmtDate(log.createdAt)}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{log.operatorId}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
