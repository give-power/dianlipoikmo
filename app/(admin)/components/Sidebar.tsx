"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "今日看板",
    badgeKey: null,
    path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/projects",
    label: "项目管理",
    badgeKey: null,
    path: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  },
  {
    href: "/corrections",
    label: "纠偏中心",
    badgeKey: "corrections" as const,
    path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  {
    href: "/finance",
    label: "财务核算",
    badgeKey: null,
    path: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    href: "/visas",
    label: "签证管理",
    badgeKey: "visas" as const,
    path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    href: "/annual",
    label: "年度汇总",
    badgeKey: null,
    path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    href: "/workers",
    label: "工人管理",
    badgeKey: null,
    path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [badges, setBadges] = useState<{ corrections: number; visas: number }>({
    corrections: 0,
    visas: 0,
  });

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const [c, v] = await Promise.all([
          fetch("/api/corrections").then((r) => r.json()),
          fetch("/api/visas").then((r) => r.json()),
        ]);
        setBadges({
          corrections: Array.isArray(c)
            ? c.filter((x: { status: string }) => x.status === "pending").length
            : 0,
          visas: Array.isArray(v)
            ? v.filter((x: { status: string }) => x.status === "pending").length
            : 0,
        });
      } catch {
        // silent fail — badges just won't show
      }
    };
    fetchBadges();
    const id = setInterval(fetchBadges, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-20"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)", boxShadow: "0 0 16px var(--accent-glow)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-none">PowerLink OS</div>
            <div className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--muted)" }}>
              配电施工管理 v2.0
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                color: isActive ? "white" : "var(--muted)",
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.path} />
              </svg>
              <span className={isActive ? "font-medium" : ""}>{item.label}</span>
              {badgeCount > 0 && (
                <span
                  className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.2)", color: "var(--amber)" }}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Agent Console */}
      <div className="px-3 pb-4">
        <div className="border-t mb-3" style={{ borderColor: "var(--border)" }} />
        <Link
          href="/agent"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full"
          style={{
            background: "rgba(59,130,246,0.06)",
            border: "1px dashed rgba(59,130,246,0.25)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span style={{ color: "var(--accent)" }}>Agent 控制台</span>
        </Link>
      </div>
    </aside>
  );
}
