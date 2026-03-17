"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { KPIResult, CSVRow, ColumnSchema } from "@/types";

interface KPICardsProps {
  kpis: KPIResult[];
  isLoading: boolean;
  rows?: CSVRow[];
  schema?: ColumnSchema[];
}

function computeColMean(rows: CSVRow[], colName: string): number | null {
  const nums = rows
    .map((r) => { const v = r[colName]; return typeof v === "number" ? v : parseFloat(String(v)); })
    .filter((n) => !isNaN(n));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function KPICards({ kpis, isLoading, rows, schema }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-3 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 text-center space-y-1 py-1">
            <Skeleton className="h-6 w-24 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  // Compact mode for single KPI so it does not consume a large card area.
  if (kpis.length === 1) {
    const kpi = kpis[0];
    let trendEl: React.ReactNode = null;

    if (rows && schema && kpi.rawValue !== undefined) {
      const numCols = schema.filter((c) => c.type === "number");
      const matchedCol = numCols.find((c) =>
        kpi.label.toLowerCase().includes(c.name.toLowerCase().replace(/_/g, " ").split(" ")[0])
      ) ?? numCols[0];

      if (matchedCol) {
        const mean = computeColMean(rows, matchedCol.name);
        if (mean !== null && mean !== 0) {
          const pct = ((kpi.rawValue - mean) / Math.abs(mean)) * 100;
          const isUp = pct >= 0;
          trendEl = (
            <span
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: isUp ? "rgba(30,28,26,0.08)" : "rgba(192,57,43,0.1)",
                color: isUp ? "#1e1c1a" : "#c0392b",
              }}
            >
              {isUp ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
            </span>
          );
        }
      }
    }

    return (
      <div className="px-1 py-1.5" style={{ animation: "fade-in 0.4s ease-out" }}>
        <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <span className="font-medium">{kpi.label}:</span>
          <span className="text-base font-bold" style={{ color: "var(--color-sage-dark)" }}>{kpi.value}</span>
          {trendEl}
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card rounded-xl p-3 flex flex-wrap gap-0 justify-between items-center"
      style={{ animation: "fade-in 0.6s ease-out" }}
    >
      {kpis.map((kpi, i) => {
        let trendEl: React.ReactNode = null;
        if (rows && schema && kpi.rawValue !== undefined) {
          const numCols = schema.filter((c) => c.type === "number");
          const matchedCol = numCols.find((c) =>
            kpi.label.toLowerCase().includes(c.name.toLowerCase().replace(/_/g, " ").split(" ")[0])
          ) ?? numCols[Math.min(i, numCols.length - 1)];
          if (matchedCol) {
            const mean = computeColMean(rows, matchedCol.name);
            if (mean !== null && mean !== 0) {
              const pct = ((kpi.rawValue - mean) / Math.abs(mean)) * 100;
              const isUp = pct >= 0;
              trendEl = (
                <span
                  className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full mt-1"
                  style={{
                    background: isUp ? "rgba(30,28,26,0.08)" : "rgba(192,57,43,0.1)",
                    color: isUp ? "#1e1c1a" : "#c0392b",
                  }}
                >
                  {isUp ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
                </span>
              );
            }
          }
        }

        return (
          <div
            key={i}
            className="flex-1 min-w-[100px] text-center px-2 py-1.5 rounded-lg transition-all duration-200 cursor-default flex flex-col items-center"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="text-lg font-bold truncate" style={{ color: "var(--color-sage-dark)" }}>
              {kpi.value}
            </div>
            {trendEl}
            <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {kpi.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
