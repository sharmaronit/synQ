"use client";

import { ChartCard } from "@/components/chart-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/lib/dashboard-store";
import type { ChartResult } from "@/types";

interface ChartsGridProps {
  charts: ChartResult[];
  isLoading: boolean;
}

export function ChartsGrid({ charts, isLoading }: ChartsGridProps) {
  const { state, dispatch } = useDashboard();

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="glass-card border rounded-2xl p-5" style={{ borderColor: "var(--color-surface-border)", boxShadow: "var(--shadow-card)" }}>
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!charts || charts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {charts.map((chart, index) => (
        <div key={`${chart.title}-${index}`} style={{ animation: "chart-slide-in 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
          <ChartCard
            chart={chart}
            config={state.chartConfigs[index] ?? {}}
            onConfigChange={(c) => dispatch({ type: "SET_CHART_CONFIG", payload: { index, config: c } })}
            chartHeight={320}
          />
        </div>
      ))}
    </div>
  );
}
