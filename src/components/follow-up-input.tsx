"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";
import type { QueryHistoryEntry } from "@/types";

interface FollowUpInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  queryHistory: QueryHistoryEntry[];
}

export function FollowUpInput({ onSubmit, isLoading, queryHistory }: FollowUpInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setQuery("");
  };

  const recentHistory = queryHistory.slice(-3);

  return (
    <div
      className="bg-white border rounded-2xl p-5"
      style={{ borderColor: "rgba(30, 28, 26,0.15)", boxShadow: "var(--shadow-card-elevated)" }}
    >
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-sage)" }}>
        Ask a follow-up question
      </p>

      {recentHistory.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {recentHistory.map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                setQuery(entry.query);
                onSubmit(entry.query);
              }}
              disabled={isLoading}
              className="px-3 py-1 rounded-full text-xs border cursor-pointer transition-all duration-150 disabled:opacity-50 truncate max-w-[200px]"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-surface-border)",
                color: "var(--color-text-muted)",
              }}
              title={entry.query}
            >
              ↩ {entry.query}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "Also filter by North region" or "Show as pie chart"'
          className="flex-1 rounded-full px-5 py-3 text-sm border-2 outline-none transition-colors"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-surface-border)",
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-sage)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-surface-border)")}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isLoading}
          className="w-12 h-12 flex items-center justify-center rounded-full text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
          style={{ background: "var(--color-sage)", boxShadow: "var(--shadow-btn)" }}
        >
          {isLoading ? <span className="spinner" /> : <SendHorizontal className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
