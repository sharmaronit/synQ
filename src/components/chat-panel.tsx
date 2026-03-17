"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SendHorizontal, MessageSquare, Sparkles, BarChart2, Hash, Lightbulb, Code2, Mic, MicOff, Plus } from "lucide-react";
import { SynqLogo } from "@/components/synq-logo";
import type { ChatMessage, DashboardSnapshot } from "@/types";

interface ChatPanelProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  messages: ChatMessage[];
  samplePrompts: string[];
  onViewDashboard?: (snapshot: DashboardSnapshot) => void;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: "var(--color-sage)",
            animation: `pulse-dot 1.4s ease-in-out ${i * 200}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}

function StepIndicator({ step, doneSteps }: { step: string; doneSteps?: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      {/* Working header */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "var(--color-sage)", animation: "pulse-dot 1.2s ease-in-out infinite" }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-sage)" }}>
          Working
        </span>
      </div>

      {/* Completed steps */}
      {doneSteps?.map((s, i) => (
        <div key={i} className="flex items-start gap-2 pl-0.5">
          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "rgba(30, 28, 26,0.45)" }} />
          <span className="text-[11px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>{s}</span>
        </div>
      ))}

      {/* Current step */}
      <div className="flex items-start gap-2 pl-0.5">
        <span
          className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "var(--color-sage)", animation: "pulse-dot 1s ease-in-out infinite" }}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium" style={{ color: "var(--color-text-primary)" }}>{step}</span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Thinking...</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onSuggestion, isLoading, onViewDashboard }: { msg: ChatMessage; onSuggestion: (s: string) => void; isLoading: boolean; onViewDashboard?: (snapshot: DashboardSnapshot) => void }) {
  const isUser = msg.role === "user";
  const [sqlOpen, setSqlOpen] = useState(false);
  const responseSnapshot = msg.responseSnapshot;

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="flex items-start gap-2 max-w-full min-w-0">
          {responseSnapshot && onViewDashboard && (
            <button
              onClick={() => onViewDashboard(responseSnapshot)}
              className="h-6 px-2 rounded-md text-[10px] font-medium border transition-all duration-150 cursor-pointer flex-shrink-0"
              style={{
                background: "transparent",
                color: "var(--color-sage-dark)",
                borderColor: "rgba(30, 28, 26, 0.25)",
              }}
              title="View dashboard generated for this prompt"
            >
              Dashboard
            </button>
          )}
        <div
            className="max-w-full sm:max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed break-words"
          style={{ background: "var(--color-sage)" }}
        >
          {msg.content}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 mb-1">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(30, 28, 26,0.12)" }}
      >
        <SynqLogo className="w-4 h-4" />
      </div>
      <div className="max-w-[90%] min-w-0 flex flex-col gap-2">
        <div
          className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed break-words"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-surface-border)",
          }}
        >
          {msg.isLoading
            ? (msg.loadingStep ? <StepIndicator step={msg.loadingStep} doneSteps={msg.doneSteps} /> : <TypingDots />)
            : (
              <ReactMarkdown
                components={{
                  p:      ({ children }) => <div className="mb-1 last:mb-0">{children}</div>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em:     ({ children }) => <em className="italic">{children}</em>,
                  ul:     ({ children }) => <ul className="my-0.5 space-y-0.5">{children}</ul>,
                  ol:     ({ children }) => <ol className="my-0.5 space-y-0.5 list-decimal list-inside">{children}</ol>,
                  li:     ({ children }) => (
                    <li className="flex items-baseline gap-1.5">
                      <span className="opacity-40 flex-shrink-0" style={{ fontSize: "8px" }}>●</span>
                      <span>{children}</span>
                    </li>
                  ),
                  code:   ({ children }) => (
                    <code className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: "rgba(30, 28, 26,0.12)" }}>
                      {children}
                    </code>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )
          }
        </div>

        {/* Stats bar */}
        {!msg.isLoading && msg.stats && (
          <div className="flex items-center gap-3 px-1">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              <BarChart2 className="w-3 h-3" style={{ color: "var(--color-sage)" }} />
              {msg.stats.charts} chart{msg.stats.charts !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(30, 28, 26,0.4)" }}>·</span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              <Hash className="w-3 h-3" style={{ color: "var(--color-sage)" }} />
              {msg.stats.kpis} KPI{msg.stats.kpis !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(30, 28, 26,0.4)" }}>·</span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              <Lightbulb className="w-3 h-3" style={{ color: "var(--color-sage)" }} />
              {msg.stats.insights} insight{msg.stats.insights !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* SQL viewer */}
        {!msg.isLoading && msg.sql && (
          <div className="px-1">
            <button
              onClick={() => setSqlOpen((v) => !v)}
              className="flex items-center gap-1 text-[11px] transition-opacity"
              style={{ color: "var(--color-text-muted)", opacity: 0.65 }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.65")}
            >
              <Code2 className="w-3 h-3" />
              {sqlOpen ? "Hide SQL" : "Show SQL"}
            </button>
            {sqlOpen && (
              <pre
                className="mt-1.5 text-[11px] rounded-lg p-2.5 overflow-x-auto font-mono leading-relaxed"
                style={{ background: "rgba(30, 28, 26,0.08)", color: "var(--color-sage-dark)", border: "1px solid rgba(30, 28, 26,0.15)" }}
              >
                {msg.sql}
              </pre>
            )}
          </div>
        )}

        {/* Suggestion chips */}
        {!msg.isLoading && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-2">
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                disabled={isLoading}
                className="text-left px-3 py-2 rounded-xl text-xs border cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(30, 28, 26,0.05)",
                  borderColor: "rgba(30, 28, 26,0.25)",
                  color: "var(--color-sage-dark)",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.borderColor = "var(--color-sage)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(30, 28, 26,0.25)";
                }}
              >
                ↳ {s}
              </button>
            ))}
          </div>
        )}

        {/* Show Graph button — only when charts are missing */}
        {!msg.isLoading && msg.showGraphButton && (
          <button
            onClick={() => onSuggestion("Show me bar charts, pie charts, and line graphs for this data")}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed mb-2"
            style={{ background: "var(--color-sage)", boxShadow: "var(--shadow-btn)" }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Show Graphs
          </button>
        )}
      </div>
    </div>
  );
}

export function ChatPanel({ onSubmit, isLoading, messages, samplePrompts, onViewDashboard }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [addChartCount, setAddChartCount] = useState<2 | 3>(2);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [showInsightBuilder, setShowInsightBuilder] = useState(false);
  const [chartXColumn, setChartXColumn] = useState("");
  const [chartYColumn, setChartYColumn] = useState("");
  const [insightNoteText, setInsightNoteText] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDraft, setSavedDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  function startVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.onresult = (e: { results: SpeechRecognitionResultList }) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setTimeout(() => { onSubmit(transcript); setInput(""); setHistoryIndex(-1); }, 150);
      }
    };
    recognitionRef.current = rec;
    rec.start();
  }

  // Ordered most-recent-first for ↑ navigation
  const sentMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .reverse();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!plusMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [plusMenuOpen]);

  const trimmedInput = input.trim();
  const isAddChartCommand = /^\/addchart(\s|$)/i.test(trimmedInput);

  const handleSubmit = () => {
    const trimmed = trimmedInput;
    if (!trimmed || isLoading) return;

    const quotedAddChartMatch = trimmed.match(/^\/addchart(?:\s+([23]))?\s+"([^"]+)"\s*$/i);
    const plainAddChartMatch = trimmed.match(/^\/addchart(?:\s+([23]))?\s*$/i);
    const unquotedAddChartMatch = trimmed.match(/^\/addchart(?:\s+([123]))?\s+(.+)$/i);

    if (quotedAddChartMatch || plainAddChartMatch || unquotedAddChartMatch) {
      const matchedCount = quotedAddChartMatch?.[1]
        ? Number(quotedAddChartMatch[1])
        : plainAddChartMatch?.[1]
        ? Number(plainAddChartMatch[1])
        : unquotedAddChartMatch?.[1]
        ? Number(unquotedAddChartMatch[1])
        : null;

      const textFocus = (unquotedAddChartMatch?.[2] ?? "").trim();
      const optionalFocus = (quotedAddChartMatch?.[2] ?? textFocus).trim();

      const chartCount = matchedCount === 1
        ? 1
        : matchedCount === 3
        ? 3
        : matchedCount === 2
        ? 2
        : (unquotedAddChartMatch ? 1 : addChartCount);

      const generatedPrompt = optionalFocus
        ? `Add ${chartCount} additional ${chartCount === 1 ? "chart" : "charts"} to the current dashboard with different perspectives, focused on ${optionalFocus}.`
        : `Add ${chartCount} additional ${chartCount === 1 ? "chart" : "charts"} to the current dashboard with different perspectives.`;
      onSubmit(generatedPrompt);
    } else {
      onSubmit(trimmed);
    }

    setInput("");
    setHistoryIndex(-1);
    setSavedDraft("");
  };

  const activateAddChartMode = () => {
    let cursorPos = 11;
    setInput((prev) => {
      const trimmed = prev.trim();
      if (/^\/addchart(?:\s+([23]))?\s+"[^"]*"\s*$/i.test(trimmed)) {
        cursorPos = trimmed.lastIndexOf("\"");
        return prev;
      }
      if (!trimmed) return '/addchart ""';
      const next = `/addchart "${trimmed}"`;
      cursorPos = next.lastIndexOf("\"");
      return next;
    });
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.selectionStart = cursorPos;
        inputRef.current.selectionEnd = cursorPos;
      }
    }, 0);
  };

  const submitChartBuilder = () => {
    const x = chartXColumn.trim();
    const y = chartYColumn.trim();
    if (!x || !y || isLoading) return;

    onSubmit(`Add 1 additional chart to the current dashboard with different perspectives, focused on ${x} vs ${y}.`);
    setChartXColumn("");
    setChartYColumn("");
    setShowChartBuilder(false);
    setPlusMenuOpen(false);
  };

  const submitInsightNote = () => {
    const note = insightNoteText.trim();
    if (!note || isLoading) return;

    onSubmit(`Add this as an insight note in the current dashboard insights: ${note}`);
    setInsightNoteText("");
    setShowInsightBuilder(false);
    setPlusMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === "ArrowUp") {
      const el = e.currentTarget;
      // Only hijack ↑ when cursor is at the very start (or file is empty)
      if (el.selectionStart === 0 && sentMessages.length > 0) {
        e.preventDefault();
        if (historyIndex === -1) setSavedDraft(input);
        const next = Math.min(historyIndex + 1, sentMessages.length - 1);
        setHistoryIndex(next);
        setInput(sentMessages[next]);
        // Place cursor at end on next tick
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = sentMessages[next].length;
          }
        }, 0);
      }
      return;
    }

    if (e.key === "ArrowDown" && historyIndex > -1) {
      e.preventDefault();
      const next = historyIndex - 1;
      setHistoryIndex(next);
      setInput(next === -1 ? savedDraft : sentMessages[next]);
      return;
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        borderLeft: "1px solid var(--color-surface-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 pl-12 pr-4 py-3.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-surface-border)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(30, 28, 26,0.12)" }}
        >
          <MessageSquare className="w-4 h-4" style={{ color: "var(--color-sage)" }} />
        </div>
        <div className="pl-6">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            synQ Chat
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Ask anything about your data
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(30, 28, 26,0.1)" }}
            >
              <Sparkles className="w-6 h-6" style={{ color: "var(--color-sage)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                Start exploring your data
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Ask a question or pick a suggestion below
              </p>
            </div>
            {samplePrompts.length > 0 && (
              <div className="flex flex-col gap-2 w-full">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { onSubmit(prompt); }}
                    disabled={isLoading}
                    className="text-left px-3 py-2.5 rounded-xl text-xs border cursor-pointer transition-all duration-150 disabled:opacity-50"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-surface-border)",
                      color: "var(--color-text-primary)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-sage)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-surface-border)")}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onSuggestion={(s) => { onSubmit(s); }} isLoading={isLoading} onViewDashboard={onViewDashboard} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2 border-2 transition-colors"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-surface-border)",
          }}
          onFocusCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--color-sage)";
          }}
          onBlurCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--color-surface-border)";
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none text-sm outline-none bg-transparent leading-relaxed disabled:opacity-60"
            style={{
              color: "var(--color-text-primary)",
              fontFamily: "inherit",
              maxHeight: "120px",
              overflowY: "auto",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={startVoice}
            disabled={isLoading}
            title={isListening ? "Stop listening" : "Voice input"}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 mb-0.5"
            style={{ background: isListening ? "rgba(214,48,49,0.12)" : "transparent", color: isListening ? "#d63031" : "var(--color-text-muted)" }}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 mb-0.5"
            style={{ background: "var(--color-sage)" }}
          >
            {isLoading
              ? <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
              : <SendHorizontal className="w-4 h-4" />
            }
          </button>
        </div>
        {isAddChartCommand && (
          <div className="mt-2 px-1 flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              Charts:
            </span>
            <button
              type="button"
              onClick={() => setAddChartCount(2)}
              className="h-6 px-2 rounded-md text-[10px] border transition-all duration-150 cursor-pointer"
              style={{
                color: addChartCount === 2 ? "white" : "var(--color-sage-dark)",
                background: addChartCount === 2 ? "var(--color-sage)" : "transparent",
                borderColor: addChartCount === 2 ? "var(--color-sage)" : "rgba(30, 28, 26, 0.25)",
              }}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => setAddChartCount(3)}
              className="h-6 px-2 rounded-md text-[10px] border transition-all duration-150 cursor-pointer"
              style={{
                color: addChartCount === 3 ? "white" : "var(--color-sage-dark)",
                background: addChartCount === 3 ? "var(--color-sage)" : "transparent",
                borderColor: addChartCount === 3 ? "var(--color-sage)" : "rgba(30, 28, 26, 0.25)",
              }}
            >
              3
            </button>
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.8 }}>
              Use /addchart "prompt" and press Enter
            </span>
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" ref={plusMenuRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPlusMenuOpen((v) => !v)}
                disabled={isLoading}
                className="h-6 w-6 rounded-md text-[10px] border flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: plusMenuOpen ? "rgba(30, 28, 26, 0.08)" : "transparent",
                  color: "var(--color-sage-dark)",
                  borderColor: "rgba(30, 28, 26, 0.25)",
                }}
                title="Add"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {plusMenuOpen && (
                <div
                  className="absolute left-0 bottom-8 min-w-[110px] rounded-lg border p-1 z-20"
                  style={{
                    background: "rgba(250, 246, 240, 0.98)",
                    borderColor: "var(--color-surface-border)",
                    boxShadow: "0 10px 24px rgba(30, 28, 26, 0.14)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowChartBuilder(true);
                      setShowInsightBuilder(false);
                      setPlusMenuOpen(false);
                    }}
                    className="w-full text-left h-7 px-2 rounded-md text-[11px] font-medium cursor-pointer"
                    style={{ color: "var(--color-sage-dark)" }}
                  >
                    Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInsightBuilder(true);
                      setShowChartBuilder(false);
                      setPlusMenuOpen(false);
                    }}
                    className="w-full text-left h-7 px-2 rounded-md text-[11px] font-medium cursor-pointer"
                    style={{ color: "var(--color-sage-dark)" }}
                  >
                    Insight Note
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={activateAddChartMode}
              disabled={isLoading}
              className="h-6 px-2 rounded-md text-[10px] border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "transparent",
                color: "var(--color-sage-dark)",
                borderColor: "rgba(30, 28, 26, 0.25)",
              }}
              title="Add 2-3 charts in one go"
            >
              /addchart
            </button>
          </div>
          <p className="hidden lg:block text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>

        {showChartBuilder && (
          <div className="mt-2 px-1 flex items-center gap-1.5">
            <input
              value={chartXColumn}
              onChange={(e) => setChartXColumn(e.target.value)}
              placeholder="X column"
              disabled={isLoading}
              className="h-7 px-2 rounded-md text-[11px] border outline-none bg-transparent flex-1"
              style={{ borderColor: "rgba(30, 28, 26, 0.25)", color: "var(--color-text-primary)" }}
            />
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>vs</span>
            <input
              value={chartYColumn}
              onChange={(e) => setChartYColumn(e.target.value)}
              placeholder="Y column"
              disabled={isLoading}
              className="h-7 px-2 rounded-md text-[11px] border outline-none bg-transparent flex-1"
              style={{ borderColor: "rgba(30, 28, 26, 0.25)", color: "var(--color-text-primary)" }}
            />
            <button
              type="button"
              onClick={submitChartBuilder}
              disabled={!chartXColumn.trim() || !chartYColumn.trim() || isLoading}
              className="h-7 px-2 rounded-md text-[10px] font-semibold text-white transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-sage)" }}
            >
              Add
            </button>
          </div>
        )}

        {showInsightBuilder && (
          <div className="mt-2 px-1 flex items-center gap-1.5">
            <input
              value={insightNoteText}
              onChange={(e) => setInsightNoteText(e.target.value)}
              placeholder="Write insight note..."
              disabled={isLoading}
              className="h-7 px-2 rounded-md text-[11px] border outline-none bg-transparent flex-1"
              style={{ borderColor: "rgba(30, 28, 26, 0.25)", color: "var(--color-text-primary)" }}
            />
            <button
              type="button"
              onClick={submitInsightNote}
              disabled={!insightNoteText.trim() || isLoading}
              className="h-7 px-2 rounded-md text-[10px] font-semibold text-white transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-sage)" }}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
