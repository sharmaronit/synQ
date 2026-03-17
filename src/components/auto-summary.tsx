"use client";

import { AnalyticsPlan, KPIResult, InsightPlan } from "@/types";
import { Lightbulb } from "lucide-react";

interface AutoSummaryProps {
  plan: AnalyticsPlan;
  kpis: KPIResult[];
  insights: InsightPlan[];
}

export function AutoSummary({ plan, kpis, insights }: AutoSummaryProps) {
  // Generate 3-4 key findings from KPIs and insights
  const summaryPoints: string[] = [];

  // Add an observation from plan description
  if (plan.description) {
    summaryPoints.push(plan.description);
  }

  // Add key insights (pick the most important ones)
  const keyInsights = insights
    .filter((i) => i.type === "observation" || i.type === "trend")
    .slice(0, 2);

  summaryPoints.push(...keyInsights.map((i) => i.text));

  // Add a recommendation if available
  const recommendation = insights.find((i) => i.type === "recommendation");
  if (recommendation && summaryPoints.length < 4) {
    summaryPoints.push(recommendation.text);
  }

  // Limit to 4 points
  const limitedPoints = summaryPoints.slice(0, 4);

  if (limitedPoints.length === 0) {
    return null;
  }

  return (
    <div
      className="glass-card rounded-xl border overflow-hidden card-hover"
      style={{
        borderColor: "var(--color-surface-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4" style={{ color: "var(--color-sage)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-sage-dark)" }}>
            Key Findings
          </h3>
        </div>

        <div className="space-y-3">
          {limitedPoints.map((point, i) => (
            <div key={i} className="flex gap-3">
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "rgba(30, 28, 26, 0.1)",
                  color: "var(--color-sage)",
                }}
              >
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
