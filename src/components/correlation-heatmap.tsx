"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { computeCorrelationMatrix } from "@/lib/statistics";
import type { CSVRow } from "@/types";

interface CorrelationHeatmapProps {
  rows: CSVRow[];
  numericCols: string[];
}

function correlationColor(r: number): string {
  // r: -1 (red) → 0 (white) → 1 (sage)
  if (r >= 0) {
    const t = r;
    const rC = Math.round(255 - t * (255 - 107));
    const gC = Math.round(255 - t * (255 - 144));
    const bC = Math.round(255 - t * (255 - 128));
    return `rgb(${rC},${gC},${bC})`;
  } else {
    const t = -r;
    const rC = Math.round(255 - t * (255 - 214));
    const gC = Math.round(255 - t * (255 - 48));
    const bC = Math.round(255 - t * (255 - 49));
    return `rgb(${rC},${gC},${bC})`;
  }
}

export function CorrelationHeatmap({ rows, numericCols }: CorrelationHeatmapProps) {
  const [open, setOpen] = useState(true);

  const { cols, matrix } = useMemo(
    () => computeCorrelationMatrix(rows, numericCols),
    [rows, numericCols]
  );

  if (cols.length < 2) return null;

  const cellSize = Math.max(44, Math.min(70, Math.floor(520 / cols.length)));

  return (
    <div
      className="border rounded-2xl overflow-hidden card-hover"
      style={{ borderColor: "var(--color-surface-border)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer"
      >
        <h3 className="text-base font-semibold" style={{ color: "var(--color-sage)" }}>Correlation Matrix</h3>
        {open ? (
          <ChevronUp className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ animation: "fade-in 0.25s ease-out" }}>
          <div className="overflow-x-auto">
            <table className="border-separate" style={{ borderSpacing: "3px" }}>
              <thead>
                <tr>
                  <th style={{ width: cellSize }} />
                  {cols.map((col) => (
                    <th
                      key={col}
                      className="text-xs font-medium truncate max-w-[70px]"
                      style={{
                        color: "var(--color-text-muted)",
                        width: cellSize,
                        maxWidth: cellSize,
                        padding: "2px 4px",
                        textAlign: "center",
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        height: "60px",
                        verticalAlign: "bottom",
                      }}
                      title={col}
                    >
                      {col.length > 8 ? col.slice(0, 8) + "…" : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={cols[i]}>
                    <td
                      className="text-xs font-medium truncate"
                      style={{
                        color: "var(--color-text-muted)",
                        maxWidth: cellSize,
                        padding: "2px 8px 2px 0",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                      title={cols[i]}
                    >
                      {cols[i].length > 8 ? cols[i].slice(0, 8) + "…" : cols[i]}
                    </td>
                    {row.map((val, j) => (
                      <td
                        key={j}
                        title={`${cols[i]} vs ${cols[j]}: ${val}`}
                        className="rounded-lg text-center text-xs font-semibold transition-transform hover:scale-105 cursor-default"
                        style={{
                          width: cellSize,
                          height: cellSize,
                          background: correlationColor(val),
                          color: Math.abs(val) > 0.5 ? "white" : "var(--color-text-primary)",
                          border: i === j ? "2px solid rgba(30, 28, 26,0.4)" : "none",
                        }}
                      >
                        {val.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Negative</span>
            <div className="flex-1 h-3 rounded-full" style={{ background: "linear-gradient(to right, #d63031, white, #6b9080)" }} />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Positive</span>
          </div>
        </div>
      )}
    </div>
  );
}
