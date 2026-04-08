"use client";
import { useState, useEffect, useCallback } from "react";

interface InsuranceInfo {
  type?: string;
  policyNo?: string;
  expireDate?: string;
}

interface Worker {
  id: string;
  name: string;
  project: string;
  phone?: string | null;
  idCard?: string | null;
  insuranceInfo?: InsuranceInfo | null;
  wageType?: string | null;
  wageRate?: number | null;
  loginPin?: string | null;
}

interface Project {
  id: number;
  name: string;
  code: string;
}

const WAGE_LABELS: Record<string, string> = {
  daily: "日薪",
  monthly: "月薪",
  piecework: "计件",
};

function EditDrawer({
  worker,
  projects,
  onClose,
  onSaved,
}: {
  worker: Worker;
  projects: Project[];
  onClose: () => void;
  onSaved: (updated: Worker) => void;
}) {
  const ins = (worker.insuranceInfo ?? {}) as InsuranceInfo;
  const [name, setName] = useState(worker.name);
  const [project, setProject] = useState(worker.project);
  const [phone, setPhone] = useState(worker.phone ?? "");
  const [idCard, setIdCard] = useState(worker.idCard ?? "");
  const [loginPin, setLoginPin] = useState(worker.loginPin ?? "");
  const [wageType, setWageType] = useState(worker.wageType ?? "daily");
  const [wageRate, setWageRate] = useState(worker.wageRate?.toString() ?? "");
  const [insType, setInsType] = useState(ins.type ?? "");
  const [insPolicyNo, setInsPolicyNo] = useState(ins.policyNo ?? "");
  const [insExpire, setInsExpire] = useState(ins.expireDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !project.trim()) return;
    setSaving(true);
    setError(null);
    const insuranceInfo =
      insType || insPolicyNo || insExpire
        ? { type: insType || undefined, policyNo: insPolicyNo || undefined, expireDate: insExpire || undefined }
        : null;
    try {
      const res = await fetch(`/api/workers/${worker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          project: project.trim(),
          phone: phone.trim() || null,
          idCard: idCard.trim() || null,
          loginPin: loginPin.trim() || null,
          wageType: wageType || null,
          wageRate: wageRate ? parseFloat(wageRate) : null,
          insuranceInfo,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSaved(updated);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? `保存失败（HTTP ${res.status}）`);
      }
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-40 flex flex-col overflow-y-auto"
        style={{
          width: "420px",
          background: "#0d1929",
          borderLeft: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <div className="text-sm font-semibold text-white">编辑工人档案</div>
            <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--muted)" }}>
              {worker.id}
            </div>
          </div>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: "var(--muted)" }}>
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 flex-1">
          {/* 基本信息 */}
          <section>
            <div className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              基本信息
            </div>
            <div className="space-y-3">
              <Field label="姓名 *">
                <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
              </Field>
              <Field label="所属项目 *">
                {projects.length > 0 ? (
                  <select value={project} onChange={(e) => setProject(e.target.value)} className="field-input">
                    {projects.map((p) => (
                      <option key={p.id} value={p.name} style={{ background: "#0d1929" }}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={project} onChange={(e) => setProject(e.target.value)} className="field-input" />
                )}
              </Field>
              <Field label="手机号">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="13x..." className="field-input" />
              </Field>
            </div>
          </section>

          {/* 身份与登录 */}
          <section>
            <div className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              身份与登录
            </div>
            <div className="space-y-3">
              <Field label="身份证号">
                <input
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder="18位身份证"
                  maxLength={18}
                  className="field-input font-mono"
                />
              </Field>
              <Field label="登录 PIN（4位）">
                <input
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="手机后4位或身份证后4位"
                  maxLength={4}
                  className="field-input font-mono tracking-widest"
                />
              </Field>
            </div>
          </section>

          {/* 薪资 */}
          <section>
            <div className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              薪资标准
            </div>
            <div className="space-y-3">
              <Field label="薪资类型">
                <div className="flex gap-2">
                  {(["daily", "monthly", "piecework"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setWageType(t)}
                      className="flex-1 py-1.5 text-xs rounded-lg transition-all"
                      style={{
                        background: wageType === t ? "var(--accent)" : "var(--bg)",
                        color: wageType === t ? "#fff" : "var(--muted)",
                        border: "1px solid",
                        borderColor: wageType === t ? "var(--accent)" : "var(--border)",
                      }}
                    >
                      {WAGE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={`${WAGE_LABELS[wageType] ?? ""}金额（元）`}>
                <input
                  type="number"
                  value={wageRate}
                  onChange={(e) => setWageRate(e.target.value)}
                  placeholder={wageType === "daily" ? "如：350" : wageType === "monthly" ? "如：8000" : "如：12.5"}
                  className="field-input font-mono"
                />
              </Field>
            </div>
          </section>

          {/* 保险信息 */}
          <section>
            <div className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              保险信息
            </div>
            <div className="space-y-3">
              <Field label="险种">
                <input
                  value={insType}
                  onChange={(e) => setInsType(e.target.value)}
                  placeholder="如：建筑工人意外险"
                  className="field-input"
                />
              </Field>
              <Field label="保单号">
                <input
                  value={insPolicyNo}
                  onChange={(e) => setInsPolicyNo(e.target.value)}
                  placeholder="保单编号"
                  className="field-input font-mono"
                />
              </Field>
              <Field label="有效期至">
                <input
                  type="date"
                  value={insExpire}
                  onChange={(e) => setInsExpire(e.target.value)}
                  className="field-input"
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          {error && (
            <div
              className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
            >
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!name.trim() || !project.trim() || saving}
              className="btn-primary text-sm px-5 py-2 flex-1 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{label}</div>
      {children}
    </div>
  );
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/workers").then((r) => r.json());
      setWorkers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setProjects(d);
          if (d.length > 0 && !project) setProject(d[0].name);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !project.trim()) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), project: project.trim(), phone: phone.trim() || null }),
      });
      if (res.ok) {
        setName(""); setPhone(""); setShowForm(false); setCreateError(null);
        fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error ?? `创建失败（HTTP ${res.status}）`);
      }
    } catch {
      setCreateError("网络错误，请检查连接后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除该工人？此操作无法撤销。")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "删除失败，请重试");
        return;
      }
      setWorkers((prev) => prev.filter((w) => w.id !== id));
    } catch {
      alert("删除失败，请检查网络连接后重试");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">工人管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "加载中..." : `共 ${workers.length} 名工人`}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2">
          + 新增工人
        </button>
      </div>

      <div className="px-8 py-6">
        {/* Create Form */}
        {showForm && (
          <div className="glass rounded-xl p-5 mb-6" style={{ borderLeft: "2px solid var(--accent)" }}>
            <div className="text-sm font-semibold text-white mb-4">新增工人</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>姓名 *</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：张三"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>所属项目 *</div>
                {projects.length > 0 ? (
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.name} style={{ background: "#0d1929" }}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    placeholder="例：汇龙配电所改造"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                )}
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>手机号（选填）</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="13x..."
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
            </div>
            {createError && (
              <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                {createError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || !project.trim() || submitting}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "创建中..." : "确认创建"}
              </button>
              <button
                onClick={() => { setShowForm(false); setName(""); setPhone(""); setCreateError(null); }}
                className="btn-ghost text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Workers List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无工人记录</span>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2 mt-2">
              + 新增第一个工人
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {workers.map((w) => {
              const ins = w.insuranceInfo as InsuranceInfo | null;
              const insExpired =
                ins?.expireDate && new Date(ins.expireDate) < new Date();
              return (
                <div
                  key={w.id}
                  className="glass rounded-xl px-5 py-4 flex items-center justify-between gap-4 cursor-pointer transition-all"
                  style={{ borderLeft: "2px solid transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = "transparent")}
                  onClick={() => setEditWorker(w)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                    >
                      {w.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{w.name}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--muted)" }}>
                        <span>{w.project}</span>
                        {w.phone && <span>· {w.phone}</span>}
                        {w.wageType && w.wageRate != null && (
                          <span className="font-mono" style={{ color: "var(--accent)" }}>
                            · {WAGE_LABELS[w.wageType]} ¥{w.wageRate}
                          </span>
                        )}
                        {insExpired && (
                          <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                            保险已过期
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-mono hidden sm:block" style={{ color: "var(--muted)" }}>{w.id}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditWorker(w); }}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
                      disabled={deletingId === w.id}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                      style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                    >
                      {deletingId === w.id ? "删除中" : "删除"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Drawer */}
      {editWorker && (
        <EditDrawer
          worker={editWorker}
          projects={projects}
          onClose={() => setEditWorker(null)}
          onSaved={(updated) => {
            setWorkers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
            setEditWorker(null);
          }}
        />
      )}

      {/* field-input global style */}
      <style>{`
        .field-input {
          width: 100%;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}
