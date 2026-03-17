"use client";

import { Eye, TrendingUp, AlertTriangle, Lightbulb, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { InsightPlan } from "@/types";

interface InsightsSummaryProps {
  insights: InsightPlan[];
  isLoading: boolean;
  onExplain?: (query: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  observation:    { icon: <Eye className="w-3.5 h-3.5 flex-shrink-0" />,         bg: "rgba(30,28,26,0.07)", color: "var(--color-sage)",   label: "Observation" },
  trend:          { icon: <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />,  bg: "rgba(30,28,26,0.07)", color: "var(--color-sage)",   label: "Trend" },
  anomaly:        { icon: <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />, bg: "rgba(192,57,43,0.09)", color: "var(--color-danger)", label: "Anomaly" },
  recommendation: { icon: <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />,  bg: "rgba(30,28,26,0.07)", color: "var(--color-sage)",   label: "Recommendation" },
};

export function InsightsSummary({ insights, isLoading, onExplain }: InsightsSummaryProps) {
  if (isLoading) {
    return (
      <div className="bg-white border rounded-2xl p-4" style={{ borderColor: "var(--color-surface-border)", boxShadow: "var(--shadow-card)" }}>
        <Skeleton className="h-4 w-32 mb-3" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full mb-2 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div
      className="bg-white border rounded-2xl p-4 card-hover"
      style={{ borderColor: "var(--color-surface-border)", boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-sage)" }}>Key Insights</h3>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.observation;
          return (
            <div
              key={i}
              className="flex items-start gap-2.5 p-2.5 rounded-lg group"
              style={{ background: cfg.bg, animation: `slide-in-up 0.4s ease-out ${i * 80}ms backwards` }}
            >
              <span style={{ color: cfg.color, marginTop: "2px" }}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider block mb-0.5" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
                  {insight.text}
                </p>
              </div>
              {onExplain && (
                <button
                  onClick={() => onExplain(`Explain in more detail: ${insight.text}`)}
                  title="Explain more"
                  className="p-1.5 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30, 28, 26,0.15)"; e.currentTarget.style.color = "var(--color-sage)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
