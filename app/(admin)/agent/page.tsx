"use client";
import { useState, useRef, useEffect } from "react";

interface Msg {
  role: "user" | "agent";
  text: string;
}

const SUGGESTIONS = [
  "今日打卡情况",
  "待确认签证汇总",
  "今日报量",
  "待处理纠偏申请",
  "所有项目利润率对比",
  "批准 ID 为 1 的签证",
  "驳回 ID 为 2 的纠偏",
];

const WELCOME: Msg = {
  role: "agent",
  text: "你好，我是 PowerLink Agent。我已连接实时数据库，可以回答关于项目进度、打卡记录、签证、纠偏等问题。",
};

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const newMsg: Msg = { role: "user", text: trimmed };
    const updatedMsgs = [...msgs, newMsg];

    setMsgs(updatedMsgs);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMsgs }),
      });
      const data = await res.json();
      const reply = data.text ?? data.error ?? "（获取回答失败，请重试）";
      setMsgs((prev) => [...prev, { role: "agent", text: reply }]);
    } catch {
      setMsgs((prev) => [...prev, { role: "agent", text: "网络错误，请稍后重试" }]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const toggleVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => sendText(event.results[0][0].transcript);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{
          background: "rgba(7,13,26,0.85)",
          borderColor: "var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Agent 控制台</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {speechSupported ? "支持语音指令 · 点击麦克风开始" : "文字指令直接操控数据"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--green)" }}>
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "var(--green)" }}
          />
          已连接实时数据
        </div>
      </div>

      <div className="flex-1 px-8 py-6 flex flex-col gap-5 max-w-3xl mx-auto w-full">
        {/* 快捷指令 */}
        <div>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            快捷指令 · 点击即发送
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="btn-ghost text-xs"
                onClick={() => sendText(s)}
                disabled={thinking}
                style={{ opacity: thinking ? 0.5 : 1 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 对话历史 */}
        <div className="flex-1 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-lg rounded-xl px-4 py-3 text-sm"
                style={
                  m.role === "user"
                    ? {
                        background: "rgba(59,130,246,0.15)",
                        border: "1px solid rgba(59,130,246,0.25)",
                        color: "var(--text)",
                      }
                    : {
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }
                }
              >
                {m.role === "agent" && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                    >
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    <span className="text-[10px] font-mono" style={{ color: "var(--accent)" }}>
                      PowerLink Agent
                    </span>
                  </div>
                )}
                <p className="leading-relaxed whitespace-pre-wrap text-sm"
                  dangerouslySetInnerHTML={{
                    __html: m.text
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/`(.+?)`/g, "<code class='px-1 rounded text-xs' style='background:rgba(255,255,255,0.08)'>$1</code>"),
                  }}
                />
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {thinking && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span className="text-[10px] font-mono" style={{ color: "var(--accent)" }}>
                    PowerLink Agent
                  </span>
                </div>
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--accent)",
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 输入框 */}
        <div className="flex gap-2">
          {speechSupported && (
            <button
              onClick={toggleVoice}
              disabled={thinking}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90"
              style={{
                background: listening ? "rgba(239,68,68,0.15)" : "var(--surface)",
                border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
                color: listening ? "#ef4444" : "var(--muted)",
                opacity: thinking ? 0.5 : 1,
              }}
              title="语音输入"
            >
              {listening ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !thinking && sendText(input)}
            placeholder={
              listening ? "正在听，请说话..." : thinking ? "Agent 正在思考..." : "输入指令..."
            }
            disabled={thinking}
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: "var(--surface)",
              border: `1px solid ${listening ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
              color: "var(--text)",
              opacity: thinking ? 0.7 : 1,
            }}
          />
          <button
            className="btn-primary px-5 shrink-0"
            onClick={() => sendText(input)}
            disabled={thinking || !input.trim()}
            style={{ opacity: thinking || !input.trim() ? 0.5 : 1 }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
