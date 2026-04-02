"use client";
import { useRouter } from "next/navigation";

const roles = [
  {
    href: "/admin/dashboard",
    title: "管理后台",
    desc: "财务核算 / 看板",
    color: "#3b82f6",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/boss",
    title: "分包老板",
    desc: "项目管控 / 签证审批",
    color: "#3b82f6",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/worker",
    title: "工人端",
    desc: "打卡 / 语音报量",
    color: "#10b981",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

export default function RolePage() {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-12">
      <div className="text-center">
        <div className="flex items-center gap-2.5 justify-center mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#3b82f6", boxShadow: "0 0 20px rgba(59,130,246,0.5)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">PowerLink OS</span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
          >
            v2.0
          </span>
        </div>
        <p className="text-sm" style={{ color: "#64748b" }}>
          配电施工管理智能体 — 选择角色进入
        </p>
      </div>

      <div className="flex gap-4">
        {roles.map((role) => (
          <button
            key={role.href}
            onClick={() => router.push(role.href)}
            className="glass rounded-2xl p-7 w-48 text-left transition-all hover:-translate-y-1.5 cursor-pointer"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = role.color + "55")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
          >
            <div className="mb-5" style={{ color: role.color }}>
              {role.icon}
            </div>
            <div className="font-semibold text-white text-base">{role.title}</div>
            <div className="text-xs mt-1" style={{ color: "#64748b" }}>
              {role.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
