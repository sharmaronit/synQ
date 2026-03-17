"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Maximize2, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { ColumnStatsPanel } from "@/components/column-stats-panel";
import { detectOutlierRows } from "@/lib/statistics";
import type { CSVRow, ColumnSchema } from "@/types";

interface DataTableProps {
  data: CSVRow[];
  columns: string[];
  title?: string;
  isLoading: boolean;
  allRows?: CSVRow[];
  schema?: ColumnSchema[];
}

interface TableContentProps {
  data: CSVRow[];
  columns: string[];
  outlierRows?: Set<number>;
  rowOffset?: number;
  onColumnClick?: (col: string) => void;
  topSpacerHeight?: number;
  bottomSpacerHeight?: number;
  fixedRowHeight?: number;
}

function TableContent({ data, columns, outlierRows, rowOffset = 0, onColumnClick, topSpacerHeight = 0, bottomSpacerHeight = 0, fixedRowHeight }: TableContentProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow style={{ background: "var(--color-surface)" }}>
          {columns.map((col) => (
            <TableHead
              key={col}
              className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
              style={{
                color: "var(--color-text-muted)",
                background: "var(--color-surface)",
                cursor: onColumnClick ? "pointer" : "default",
              }}
              onClick={() => onColumnClick?.(col)}
              title={onColumnClick ? `View stats for ${col}` : undefined}
            >
              {col}
              {onColumnClick && <span className="ml-1 opacity-40 text-[10px]">↗</span>}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {topSpacerHeight > 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} style={{ padding: 0, height: `${topSpacerHeight}px`, border: "none" }} />
          </TableRow>
        )}
        {data.map((row, i) => {
          const globalIdx = i + rowOffset;
          const isOutlier = outlierRows?.has(globalIdx);
          return (
            <TableRow
              key={globalIdx}
              className="transition-colors border-b"
              style={{
                borderColor: "var(--color-surface-border)",
                borderLeft: isOutlier ? "3px solid #f59e0b" : undefined,
                background: isOutlier ? "rgba(245,158,11,0.04)" : undefined,
                height: fixedRowHeight ? `${fixedRowHeight}px` : undefined,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = isOutlier ? "rgba(245,158,11,0.08)" : "rgba(30, 28, 26,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = isOutlier ? "rgba(245,158,11,0.04)" : "transparent")}
            >
              {columns.map((col) => (
                <TableCell key={col} className="text-sm whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>
                  {String(row[col] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
        {bottomSpacerHeight > 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} style={{ padding: 0, height: `${bottomSpacerHeight}px`, border: "none" }} />
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function toCSV(data: CSVRow[], columns: string[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...data.map(row => columns.map(c => escape(row[c])).join(","))].join("\n");
}

function downloadCSV(data: CSVRow[], columns: string[], filename: string) {
  const blob = new Blob([toCSV(data, columns)], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable({ data, columns, title = "Data", isLoading, allRows, schema }: DataTableProps) {
  const ROWS_PER_PAGE = 50;
  const OUTLIER_MAX_ROWS = 100_000;
  const FULLSCREEN_VIRTUALIZE_THRESHOLD = 5_000;
  const FULLSCREEN_ROW_HEIGHT = 42;
  const FULLSCREEN_OVERSCAN = 20;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [page, setPage] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const [statsCol, setStatsCol] = useState<string | null>(null);
  const [fullscreenScrollTop, setFullscreenScrollTop] = useState(0);
  const [fullscreenViewportHeight, setFullscreenViewportHeight] = useState(700);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset to first page whenever the data changes
  useEffect(() => { setPage(0); }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
  const visibleData = data.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const rowStart = page * ROWS_PER_PAGE + 1;
  const rowEnd = Math.min((page + 1) * ROWS_PER_PAGE, data.length);

  const numericColNames = useMemo(
    () => schema?.filter((c) => c.type === "number").map((c) => c.name) ?? [],
    [schema]
  );

  const outlierRows = useMemo(
    () => {
      if (!allRows || numericColNames.length === 0) return new Set<number>();
      if (allRows.length > OUTLIER_MAX_ROWS) return new Set<number>();
      return detectOutlierRows(allRows, numericColNames);
    },
    [allRows, numericColNames]
  );

  const statsColSchema = useMemo(
    () => schema?.find((c) => c.name === statsCol) ?? null,
    [schema, statsCol]
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolled(el.scrollTop > 8);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
    setFullscreenScrollTop(el.scrollTop);
    setFullscreenViewportHeight(el.clientHeight);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const el = scrollRef.current;
    if (!el) return;
    setFullscreenViewportHeight(el.clientHeight);
    setFullscreenScrollTop(el.scrollTop);
  }, [isFullscreen]);

  const shouldVirtualizeFullscreen = isFullscreen && data.length > FULLSCREEN_VIRTUALIZE_THRESHOLD;
  const visibleRowCount = Math.ceil(fullscreenViewportHeight / FULLSCREEN_ROW_HEIGHT) + (FULLSCREEN_OVERSCAN * 2);
  const virtualStart = shouldVirtualizeFullscreen
    ? Math.max(0, Math.floor(fullscreenScrollTop / FULLSCREEN_ROW_HEIGHT) - FULLSCREEN_OVERSCAN)
    : 0;
  const virtualEnd = shouldVirtualizeFullscreen
    ? Math.min(data.length, virtualStart + visibleRowCount)
    : data.length;
  const virtualData = shouldVirtualizeFullscreen ? data.slice(virtualStart, virtualEnd) : data;
  const topSpacerHeight = shouldVirtualizeFullscreen ? virtualStart * FULLSCREEN_ROW_HEIGHT : 0;
  const bottomSpacerHeight = shouldVirtualizeFullscreen ? (data.length - virtualEnd) * FULLSCREEN_ROW_HEIGHT : 0;

  if (isLoading) {
    return (
      <div className="glass-card border rounded-2xl p-5" style={{ borderColor: "var(--color-surface-border)", boxShadow: "var(--shadow-card)" }}>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  const outlierCount = outlierRows.size;

  return (
    <>
      {/* Column stats modal */}
      {statsColSchema && allRows && (
        <ColumnStatsPanel
          column={statsColSchema}
          rows={allRows}
          isOpen={true}
          onClose={() => setStatsCol(null)}
        />
      )}

      {/* Card */}
      <div className="glass-card border rounded-2xl p-5 card-hover" style={{ borderColor: "var(--color-surface-border)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold" style={{ color: "var(--color-sage)" }}>{title}</h3>
            {outlierCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(245,158,11,0.15)", color: "#d97706" }}>
                {outlierCount} outlier{outlierCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {rowStart}–{rowEnd} of {data.length} rows · {columns.length} cols
            </span>
            <button
              onClick={() => downloadCSV(data, columns, `${title.toLowerCase().replace(/\s+/g, "-")}.csv`)}
              title="Download CSV"
              className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30, 28, 26,0.1)"; e.currentTarget.style.color = "var(--color-sage)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              title="View all rows"
              className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30, 28, 26,0.1)"; e.currentTarget.style.color = "var(--color-sage)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="h-[280px] overflow-auto rounded-xl" style={{ background: "var(--color-surface)", scrollbarWidth: "thin", scrollbarColor: "rgba(30, 28, 26,0.4) transparent" }}>
          <TableContent
            data={visibleData}
            columns={columns}
            outlierRows={outlierRows}
            rowOffset={page * ROWS_PER_PAGE}
            onColumnClick={schema ? (col) => setStatsCol(col) : undefined}
          />
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--color-surface-border)", color: "var(--color-text-muted)", background: "var(--color-surface)" }}
              onMouseEnter={(e) => { if (page > 0) { e.currentTarget.style.borderColor = "var(--color-sage)"; e.currentTarget.style.color = "var(--color-sage)"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-surface-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--color-surface-border)", color: "var(--color-text-muted)", background: "var(--color-surface)" }}
              onMouseEnter={(e) => { if (page < totalPages - 1) { e.currentTarget.style.borderColor = "var(--color-sage)"; e.currentTarget.style.color = "var(--color-sage)"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-surface-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", animation: "fade-in 0.2s ease-out" }} onClick={() => setIsFullscreen(false)}>
          <div className="flex flex-col m-4 rounded-2xl overflow-hidden flex-1" style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 25px 60px rgba(0,0,0,0.25)", animation: "fade-in-scale 0.25s cubic-bezier(0.4,0,0.2,1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--color-surface-border)" }}>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-sage-dark)" }}>{title}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(30, 28, 26,0.12)", color: "var(--color-sage)" }}>
                  {data.length} rows · {columns.length} columns
                </span>
                {outlierCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(245,158,11,0.15)", color: "#d97706" }}>
                    {outlierCount} outlier{outlierCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button onClick={() => setIsFullscreen(false)} className="p-2 rounded-xl cursor-pointer" style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30, 28, 26,0.1)"; e.currentTarget.style.color = "var(--color-sage)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none transition-opacity duration-300" style={{ background: "linear-gradient(to bottom, rgba(249,248,246,0.95), transparent)", opacity: scrolled ? 1 : 0 }} />
              <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-auto table-scroll"
                style={{ scrollBehavior: "smooth", background: "var(--color-surface)", scrollbarWidth: "thin", scrollbarColor: "rgba(30, 28, 26,0.4) transparent" }}>
                <TableContent
                  data={virtualData}
                  columns={columns}
                  outlierRows={outlierRows}
                  rowOffset={virtualStart}
                  topSpacerHeight={topSpacerHeight}
                  bottomSpacerHeight={bottomSpacerHeight}
                  fixedRowHeight={shouldVirtualizeFullscreen ? FULLSCREEN_ROW_HEIGHT : undefined}
                  onColumnClick={schema ? (col) => setStatsCol(col) : undefined}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-10 z-10 pointer-events-none transition-opacity duration-300" style={{ background: "linear-gradient(to top, rgba(249,248,246,0.95), transparent)", opacity: atBottom ? 0 : 1 }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
