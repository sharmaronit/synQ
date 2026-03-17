"use client";

import { FileSpreadsheet, Hash, Type, Calendar, ToggleLeft, Rows3 } from "lucide-react";
import type { Dataset, CSVRow } from "@/types";

interface DatasetOverviewProps {
  dataset: Dataset;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; dot: string; color: string; bg: string }> = {
  number:  { label: "Number",  icon: <Hash className="w-3 h-3" />,        dot: "#1e1c1a",              color: "#1e1c1a",              bg: "rgba(30,28,26,0.07)" },
  string:  { label: "Text",    icon: <Type className="w-3 h-3" />,        dot: "#1e1c1a",              color: "#1e1c1a",              bg: "rgba(30,28,26,0.07)" },
  date:    { label: "Date",    icon: <Calendar className="w-3 h-3" />,    dot: "#1e1c1a",              color: "#1e1c1a",              bg: "rgba(30,28,26,0.07)" },
  boolean: { label: "Boolean", icon: <ToggleLeft className="w-3 h-3" />,  dot: "#1e1c1a",              color: "#1e1c1a",              bg: "rgba(30,28,26,0.07)" },
};

function getPreview(col: Dataset["schema"]["columns"][number], rows: CSVRow[]): string {
  if (col.type === "number") {
    const nums = rows
      .map((r) => { const v = r[col.name]; return typeof v === "number" ? v : parseFloat(String(v)); })
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return "—";
    let min = nums[0], max = nums[0];
    for (const n of nums) { if (n < min) min = n; if (n > max) max = n; }
    const fmt = (v: number) =>
      Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
      : Math.abs(v) >= 1_000   ? `${(v / 1_000).toFixed(1)}K`
      : v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return `${fmt(min)} – ${fmt(max)}`;
  }

  if (col.type === "date") {
    const dates = rows.map((r) => r[col.name]).filter((v) => v !== null && v !== "").map(String).sort();
    if (dates.length === 0) return "—";
    return `${dates[0]}  →  ${dates[dates.length - 1]}`;
  }

  if (col.type === "string") {
    const samples = col.sampleValues.slice(0, 3).map(String).filter(Boolean);
    if (col.uniqueCount <= 3) return samples.join(", ");
    return `${samples.slice(0, 2).join(", ")}… · ${col.uniqueCount.toLocaleString()} unique`;
  }

  return `${col.uniqueCount} unique`;
}

export function DatasetOverview({ dataset }: DatasetOverviewProps) {
  const { schema, rows, name } = dataset;

  const numericCount = schema.columns.filter((c) => c.type === "number").length;
  const textCount    = schema.columns.filter((c) => c.type === "string").length;
  const dateCount    = schema.columns.filter((c) => c.type === "date").length;

  return (
    <div className="w-full max-w-3xl mx-auto" style={{ animation: "fade-in-scale 0.45s cubic-bezier(0.4,0,0.2,1)" }}>

      {/* ── File header card ── */}
      <div
        className="rounded-2xl p-4 mb-3 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(14px)",
          border: "1px solid var(--color-surface-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(30, 28, 26,0.12)" }}>
          <FileSpreadsheet className="w-5 h-5" style={{ color: "var(--color-sage)" }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }} title={name}>
            {name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <Rows3 className="w-3 h-3" />
              {schema.rowCount.toLocaleString()} rows
            </span>
            <span style={{ color: "var(--color-surface-border)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {schema.columns.length} columns
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {numericCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(30,28,26,0.08)", color: "var(--color-text-primary)" }}>
              {numericCount} numeric
            </span>
          )}
          {textCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(30, 28, 26,0.12)", color: "var(--color-sage)" }}>
              {textCount} text
            </span>
          )}
          {dateCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(30,28,26,0.08)", color: "var(--color-text-primary)" }}>
              {dateCount} date
            </span>
          )}
        </div>
      </div>

      {/* ── Column table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(14px)",
          border: "1px solid var(--color-surface-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Table header */}
        <div
          className="grid px-4 py-2.5"
          style={{
            gridTemplateColumns: "28px 1fr 90px 1fr",
            gap: "0 12px",
            borderBottom: "1px solid var(--color-surface-border)",
            background: "var(--color-surface)",
          }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>#</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Column</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Type</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Sample / Range</span>
        </div>

        {/* Scrollable rows */}
        <div style={{ maxHeight: "520px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "rgba(30, 28, 26,0.3) transparent" }}>
          {schema.columns.map((col, i) => {
            const meta = TYPE_META[col.type] ?? TYPE_META.string;
            const preview = getPreview(col, rows);
            const isEven = i % 2 === 0;

            return (
              <div
                key={col.name}
                className="grid px-4 py-2.5 items-center transition-colors duration-100"
                style={{
                  gridTemplateColumns: "28px 1fr 90px 1fr",
                  gap: "0 12px",
                  background: isEven ? "transparent" : "rgba(30, 28, 26,0.025)",
                  borderBottom: i < schema.columns.length - 1 ? "1px solid rgba(30, 28, 26,0.07)" : "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = isEven ? "transparent" : "rgba(30, 28, 26,0.025)")}
              >
                {/* Row number */}
                <span className="text-[11px] tabular-nums" style={{ color: "var(--color-text-muted)", opacity: 0.5 }}>
                  {i + 1}
                </span>

                {/* Column name */}
                <span
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--color-text-primary)" }}
                  title={col.name}
                >
                  {col.name}
                </span>

                {/* Type badge */}
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.icon}
                  {meta.label}
                </span>

                {/* Preview */}
                <span
                  className="text-[11px] truncate"
                  style={{ color: "var(--color-text-muted)" }}
                  title={preview}
                >
                  {preview}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-center text-[11px] mt-3" style={{ color: "var(--color-text-muted)" }}>
        Ask a question in the chat to generate your dashboard →
      </p>
    </div>
  );
}
