"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  samplePrompts: string[];
}

export function QueryInput({ onSubmit, isLoading, samplePrompts }: QueryInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  };

  const handlePromptClick = (prompt: string) => {
    setQuery(prompt);
    onSubmit(prompt);
  };

  return (
    <div
      className="bg-white rounded-2xl p-6 border"
      style={{ boxShadow: "var(--shadow-card-elevated)", borderColor: "rgba(30, 28, 26,0.1)" }}
    >
      <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-sage)" }}>
        Ask a question about your data
      </h3>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        Type in plain English — synQ will generate a dashboard for you
      </p>

      <div className="flex gap-3 mb-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Show total revenue by region..."
          rows={2}
          className="flex-1 resize-none rounded-[10px] px-4 py-3 text-sm border-2 transition-colors outline-none"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-surface-border)",
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-sage)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-surface-border)")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isLoading}
          className="px-5 py-3 rounded-[10px] text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer self-end"
          style={{ background: "var(--color-sage)", boxShadow: "var(--shadow-btn)" }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="spinner" /> Analyzing...
            </span>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {samplePrompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handlePromptClick(prompt)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-surface-border)",
                color: "var(--color-text-muted)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-sage)";
                e.currentTarget.style.color = "var(--color-sage)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-surface-border)";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
