"use client";
import { useState, useEffect, useCallback } from "react";

interface Worker {
  id: string;
  name: string;
  project: string;
  phone?: string | null;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  const handleCreate = async () => {
    if (!name.trim() || !project.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), project: project.trim(), phone: phone.trim() || null }),
      });
      if (res.ok) {
        setName(""); setProject(""); setPhone(""); setShowForm(false);
        fetchAll();
      }
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
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary text-sm px-4 py-2"
        >
          + 新增工人
        </button>
      </div>

      <div className="px-8 py-6">
        {/* Create Form */}
        {showForm && (
          <div
            className="glass rounded-xl p-5 mb-6"
            style={{ borderLeft: "2px solid var(--accent)" }}
          >
            <div className="text-sm font-semibold text-white mb-4">新增工人</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
              {[
                { label: "姓名 *", value: name, set: setName, placeholder: "例：张三" },
                { label: "所属项目 *", value: project, set: setProject, placeholder: "例：汇龙配电所改造" },
                { label: "手机号（选填）", value: phone, set: setPhone, placeholder: "13x..." },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{label}</div>
                  <input
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || !project.trim() || submitting}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "创建中..." : "确认创建"}
              </button>
              <button
                onClick={() => { setShowForm(false); setName(""); setProject(""); setPhone(""); }}
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
            {workers.map((w) => (
              <div
                key={w.id}
                className="glass rounded-xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                  >
                    {w.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{w.name}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--muted)" }}>
                      <span>{w.project}</span>
                      {w.phone && <span>· {w.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{w.id}</span>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deletingId === w.id}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                  >
                    {deletingId === w.id ? "删除中" : "删除"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
