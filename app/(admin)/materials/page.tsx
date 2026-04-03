"use client";
import { useState, useEffect, useCallback } from "react";

interface MaterialLibrary {
  id: number;
  name: string;
  projectCode: string | null;
  _count: { items: number };
}

interface Material {
  id: number;
  code: string;
  name: string;
  unit: string;
  planQty: number;
  usedQty: number;
  unitCost: number;
  library: { name: string; projectCode: string | null };
}

function varianceColor(planQty: number, usedQty: number): string {
  if (planQty === 0) return "var(--muted)";
  const ratio = usedQty / planQty;
  if (ratio > 1.1) return "#ef4444";
  if (ratio > 0.9) return "var(--amber)";
  return "var(--green)";
}

export default function MaterialsPage() {
  const [libraries, setLibraries] = useState<MaterialLibrary[]>([]);
  const [selectedLib, setSelectedLib] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/material-libraries")
      .then((r) => r.json())
      .then((d) => {
        setLibraries(Array.isArray(d) ? d : []);
        if (Array.isArray(d) && d.length > 0) setSelectedLib(d[0].id);
      });
  }, []);

  const fetchMaterials = useCallback(async () => {
    if (!selectedLib) return;
    setLoading(true);
    try {
      const data = await fetch(`/api/materials?libraryId=${selectedLib}`).then((r) => r.json());
      setMaterials(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [selectedLib]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const saveUsedQty = async (id: number) => {
    setSaving(true);
    try {
      await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, usedQty: Number(editVal) }),
      });
      setEditingId(null);
      await fetchMaterials();
    } finally { setSaving(false); }
  };

  const totalPlanCost = materials.reduce((s, m) => s + m.planQty * m.unitCost, 0);
  const totalUsedCost = materials.reduce((s, m) => s + m.usedQty * m.unitCost, 0);
  const overBudgetCount = materials.filter((m) => m.planQty > 0 && m.usedQty > m.planQty * 1.1).length;

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">材料库管控</h1>
          <p className="text-xs mt-0.5" style={{ color: overBudgetCount > 0 ? "var(--amber)" : "var(--muted)" }}>
            {overBudgetCount > 0 ? `${overBudgetCount} 种材料超耗` : "计划 vs 实际用量对比"}
          </p>
        </div>
        {/* Library tabs */}
        <div className="flex gap-1 flex-wrap">
          {libraries.map((lib) => (
            <button
              key={lib.id}
              onClick={() => setSelectedLib(lib.id)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: selectedLib === lib.id ? "rgba(59,130,246,0.2)" : "var(--surface)",
                border: `1px solid ${selectedLib === lib.id ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                color: selectedLib === lib.id ? "var(--accent)" : "var(--muted)",
              }}
            >
              {lib.name}
              <span className="ml-1 font-mono">{lib._count.items}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6 max-w-5xl mx-auto">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "计划材料成本", value: totalPlanCost > 0 ? `¥${(totalPlanCost / 10000).toFixed(2)}万` : "—", color: "var(--muted)" },
            { label: "实际材料成本", value: totalUsedCost > 0 ? `¥${(totalUsedCost / 10000).toFixed(2)}万` : "—", color: totalUsedCost > totalPlanCost ? "#ef4444" : "var(--green)" },
            { label: "超耗品种数", value: `${overBudgetCount} 种`, color: overBudgetCount > 0 ? "var(--amber)" : "var(--green)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{s.label}</div>
              <div className="text-lg font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex gap-1.5 justify-center py-20">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : libraries.length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>
            暂无材料库，请先通过 API 创建材料库
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>该库暂无材料条目</div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                  {["编码", "名称", "单位", "图纸量", "实耗量", "差异", "单价", "超耗金额", "操作"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const diff = m.usedQty - m.planQty;
                  const overCost = diff > 0 ? diff * m.unitCost : 0;
                  const vColor = varianceColor(m.planQty, m.usedQty);
                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                      <td className="px-4 py-3 font-mono" style={{ color: "var(--muted)" }}>{m.code}</td>
                      <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: "var(--muted)" }}>{m.unit}</td>
                      <td className="px-4 py-3 font-mono text-white">{m.planQty.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: vColor }}>
                        {editingId === m.id ? (
                          <input
                            type="number"
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            className="w-20 px-1.5 py-0.5 rounded text-white bg-transparent"
                            style={{ border: "1px solid var(--accent)" }}
                            autoFocus
                          />
                        ) : (
                          m.usedQty.toFixed(2)
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: vColor }}>
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: "var(--muted)" }}>
                        {m.unitCost > 0 ? `¥${m.unitCost}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: overCost > 0 ? "#ef4444" : "var(--muted)" }}>
                        {overCost > 0 ? `¥${overCost.toFixed(0)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === m.id ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => saveUsedQty(m.id)}
                              disabled={saving}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ background: "rgba(16,185,129,0.15)", color: "var(--green)" }}
                            >
                              {saving ? "..." : "保存"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ background: "var(--bg)", color: "var(--muted)" }}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(m.id); setEditVal(String(m.usedQty)); }}
                            className="text-[10px] px-2 py-1 rounded transition-all"
                            style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}
                          >
                            录入用量
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
