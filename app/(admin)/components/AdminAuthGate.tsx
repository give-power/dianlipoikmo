"use client";
import { useState, useEffect, useCallback } from "react";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "6789";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem("admin_auth") === "ok");
  }, []);

  const trySubmit = useCallback((d: string[]) => {
    if (d.join("") === ADMIN_PIN) {
      // Set server-side HTTP-only cookie for API auth (RC1)
      fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: d.join("") }),
      }).catch(() => {/* cookie is best-effort; page already guards UI */});
      sessionStorage.setItem("admin_auth", "ok");
      setAuthed(true);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits([]);
      }, 600);
    }
  }, []);

  const press = useCallback(
    (n: string) => {
      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = [...prev, n];
        if (next.length === 4) setTimeout(() => trySubmit(next), 80);
        return next;
      });
    },
    [trySubmit]
  );

  const del = () => setDigits((prev) => prev.slice(0, -1));

  // Keyboard support
  useEffect(() => {
    if (authed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") del();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authed, press]);

  if (authed === null) return null;

  if (authed) return <>{children}</>;

  const PAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div
      className="min-h-[100dvh] grid-bg flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div
        className={`flex flex-col items-center gap-8 ${shake ? "animate-[shake_0.5s_ease]" : ""}`}
        style={shake ? { animation: "shake 0.5s ease" } : {}}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent)", boxShadow: "0 0 24px var(--accent-glow)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="text-center">
            <div className="font-bold text-white tracking-tight">PowerLink OS</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              管理后台 · 请输入PIN码
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                background:
                  i < digits.length
                    ? shake
                      ? "#ef4444"
                      : "var(--accent)"
                    : "var(--surface2)",
                boxShadow:
                  i < digits.length && !shake ? "0 0 8px var(--accent-glow)" : "none",
                transform: i < digits.length ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {PAD.map((key, i) => {
            if (key === "") return <div key={i} />;
            const isDel = key === "⌫";
            return (
              <button
                key={i}
                onClick={() => (isDel ? del() : press(key))}
                className="w-16 h-16 rounded-2xl text-lg font-medium transition-all active:scale-90"
                style={{
                  background: isDel ? "transparent" : "var(--surface)",
                  border: `1px solid ${isDel ? "transparent" : "var(--border)"}`,
                  color: isDel ? "var(--muted)" : "var(--text)",
                  boxShadow: isDel ? "none" : "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {key}
              </button>
            );
          })}
        </div>

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {shake ? "PIN 错误，请重试" : "输入4位PIN码进入系统"}
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
