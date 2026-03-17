"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { computeColumnStats } from "@/lib/statistics";
import type { ColumnSchema, CSVRow } from "@/types";

interface ColumnStatsPanelProps {
  column: ColumnSchema;
  rows: CSVRow[];
  isOpen: boolean;
  onClose: () => void;
}

export function ColumnStatsPanel({ column, rows, isOpen, onClose }: ColumnStatsPanelProps) {
  const stats = useMemo(() => computeColumnStats(rows, column), [rows, column]);

  if (!isOpen) return null;

  const maxHistCount = Math.max(...(stats.histogram?.map((b) => b.count) ?? [1]), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", animation: "fade-in 0.2s ease-out" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        style={{ animation: "fade-in-scale 0.25s cubic-bezier(0.4,0,0.2,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: "var(--color-sage-dark)" }}>{stats.name}</h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(30, 28, 26,0.12)", color: "var(--color-sage)" }}
            >
              {stats.type}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg cursor-pointer hover:opacity-60">
            <X className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Total Rows", value: stats.count.toLocaleString() },
            { label: "Nulls", value: stats.nullCount.toLocaleString() },
            { label: "Unique", value: stats.uniqueCount.toLocaleString() },
            ...(stats.min !== undefined ? [
              { label: "Min", value: stats.min.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
              { label: "Max", value: stats.max!.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
              { label: "Mean", value: stats.mean!.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
              { label: "Median", value: stats.median!.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
              { label: "Std Dev", value: stats.stdDev!.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
            ] : []),
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-2 text-center" style={{ background: "rgba(30, 28, 26,0.08)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--color-sage-dark)" }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Histogram (numeric) */}
        {stats.histogram && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Distribution</p>
            <div className="space-y-1">
              {stats.histogram.map((bin, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-32 truncate flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{bin.bin}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ background: "rgba(30, 28, 26,0.1)", height: "12px" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(bin.count / maxHistCount) * 100}%`,
                        background: "var(--color-sage)",
                        minWidth: bin.count > 0 ? "4px" : "0",
                      }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{bin.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top values (string/date) */}
        {stats.topValues && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Top Values</p>
            <div className="flex flex-wrap gap-2">
              {stats.topValues.map(({ value, count }) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: "rgba(30, 28, 26,0.1)", color: "var(--color-sage-dark)" }}
                >
                  {value}
                  <span className="font-bold" style={{ color: "var(--color-sage)" }}>{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
