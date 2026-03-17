"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Settings, Download, Maximize2, X, Search, ZoomOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine as RechartLine,
} from "recharts";
import { ChartConfigPanel } from "@/components/chart-config-panel";
import { exportChartAsPNG } from "@/lib/export-utils";
import type { ChartResult, ChartConfigOverride } from "@/types";

const SAGE_PALETTE = ["#1e1c1a", "#6a5d52", "#c4b49a", "#8a7d72", "#4a3f3a", "#a09080", "#2e2a26", "#d4c8b4"];

interface ChartCardProps {
  chart: ChartResult;
  config?: ChartConfigOverride;
  onConfigChange?: (c: ChartConfigOverride) => void;
  isLoading?: boolean;
  chartHeight?: number;
}

const tickStyle = { fill: "#7a6e62", fontSize: 11 };
const gridStyle = { stroke: "rgba(30, 28, 26, 0.08)" };

const CHART_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  bar: { label: "Bar Chart", icon: "▊" },
  "horizontal-bar": { label: "Horizontal Bar", icon: "▬" },
  line: { label: "Line Chart", icon: "↗" },
  area: { label: "Area Chart", icon: "◭" },
  pie: { label: "Pie Chart", icon: "◔" },
  donut: { label: "Donut Chart", icon: "◎" },
  scatter: { label: "Scatter Plot", icon: "⁙" },
};

function renderChart(
  chart: ChartResult,
  config: ChartConfigOverride,
  data: Record<string, unknown>[]
) {
  const chartType = config.chartType ?? chart.chartType;
  const xKey = config.swapAxes ? chart.yKey : chart.xKey;
  const yKey = config.swapAxes ? chart.xKey : chart.yKey;
  const showGrid = !config.hideGrid;
  const refLines = config.referenceLines ?? [];

  const extraLines = refLines.map((rl) => (
    <RechartLine key={rl.id} y={rl.value} stroke={rl.color ?? "#d63031"} strokeDasharray="4 2" label={{ value: rl.label, fill: rl.color ?? "#d63031", fontSize: 10 }} />
  ));

  switch (chartType) {
    case "bar":
      return (
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" {...gridStyle} />}
          <XAxis dataKey={xKey} tick={tickStyle} />
          <YAxis tick={tickStyle} />
          <Tooltip />
          <Bar dataKey={yKey} fill="#1e1c1a" radius={[4, 4, 0, 0]} />
          {extraLines}
        </BarChart>
      );
    case "horizontal-bar":
      return (
        <BarChart data={data} layout="vertical">
          {showGrid && <CartesianGrid strokeDasharray="3 3" {...gridStyle} />}
          <XAxis type="number" tick={tickStyle} />
          <YAxis dataKey={xKey} type="category" tick={tickStyle} width={100} />
          <Tooltip />
          <Bar dataKey={yKey} fill="#1e1c1a" radius={[0, 4, 4, 0]} />
        </BarChart>
      );
    case "line":
      return (
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" {...gridStyle} />}
          <XAxis dataKey={xKey} tick={tickStyle} />
          <YAxis tick={tickStyle} />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke="#1e1c1a" strokeWidth={3} dot={{ fill: "#1e1c1a", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          {extraLines}
        </LineChart>
      );
    case "area":
      return (
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" {...gridStyle} />}
          <XAxis dataKey={xKey} tick={tickStyle} />
          <YAxis tick={tickStyle} />
          <Tooltip />
          <Area type="monotone" dataKey={yKey} stroke="#1e1c1a" fill="#c4b49a" fillOpacity={0.3} strokeWidth={2} />
          {extraLines}
        </AreaChart>
      );
    case "pie":
    case "donut":
      return (
        <PieChart>
          <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={90} innerRadius={chartType === "donut" ? 50 : 0} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={SAGE_PALETTE[i % SAGE_PALETTE.length]} />)}
          </Pie>
          <Tooltip /><Legend />
        </PieChart>
      );
    case "scatter":
      return (
        <ScatterChart>
          {showGrid && <CartesianGrid strokeDasharray="3 3" {...gridStyle} />}
          <XAxis dataKey={xKey} tick={tickStyle} name={xKey} />
          <YAxis dataKey={yKey} tick={tickStyle} name={yKey} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="#1e1c1a" />
        </ScatterChart>
      );
    default:
      return null;
  }
}

export function ChartCard({ chart, config = {}, onConfigChange, isLoading = false, chartHeight = 240 }: ChartCardProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [zoomOffset, setZoomOffset] = useState(0);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  const chartType = config.chartType ?? chart.chartType;
  const xKey = config.swapAxes ? chart.yKey : chart.xKey;
  const isBrushable = chartType !== "pie" && chartType !== "donut";

  const filteredData = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return chart.data;
    return chart.data.filter((row) => String(row[xKey] ?? "").toLowerCase().includes(query));
  }, [chart.data, filterQuery, xKey]);

  const zoomWindowSize = useMemo(() => {
    if (!isBrushable) return filteredData.length;
    if (zoomPercent >= 100) return filteredData.length;
    return Math.max(5, Math.floor((filteredData.length * zoomPercent) / 100));
  }, [filteredData.length, isBrushable, zoomPercent]);

  const maxZoomOffset = Math.max(0, filteredData.length - zoomWindowSize);

  const displayData = useMemo(() => {
    if (!isBrushable || zoomPercent >= 100) return filteredData;
    return filteredData.slice(zoomOffset, zoomOffset + zoomWindowSize);
  }, [filteredData, isBrushable, zoomPercent, zoomOffset, zoomWindowSize]);

  useEffect(() => {
    if (zoomOffset > maxZoomOffset) setZoomOffset(maxZoomOffset);
  }, [zoomOffset, maxZoomOffset]);

  if (isLoading) {
    return (
      <div
        className="glass-card border rounded-2xl p-5"
        style={{
          borderColor: "var(--color-surface-border)",
          boxShadow: "var(--shadow-card)"
        }}
      >
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[240px] w-full rounded-xl" />
      </div>
    );
  }

  const effectiveType = config.chartType ?? chart.chartType;
  const typeInfo = CHART_TYPE_LABELS[effectiveType] ?? { label: effectiveType, icon: "◈" };

  const actionBtnStyle = {
    color: "var(--color-text-muted)",
    background: "transparent",
    transition: "all 0.15s",
  };

  function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        title={title}
        className="p-1.5 rounded-lg cursor-pointer"
        style={actionBtnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30, 28, 26,0.12)"; e.currentTarget.style.color = "var(--color-sage)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
      >
        {children}
      </button>
    );
  }

  const chartContent = (height: number) => (
    <div ref={chartAreaRef} className="rounded-xl p-2" style={{ background: "rgba(250,246,240,0.7)", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart(chart, config, displayData as Record<string, unknown>[]) ?? <div />}
      </ResponsiveContainer>
    </div>
  );

  return (
    <>
      <div
        className="glass-card border rounded-2xl p-4 card-hover"
        style={{
          borderColor: "var(--color-surface-border)",
          boxShadow: "var(--shadow-card)"
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between mb-2 gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0" style={{ background: "rgba(30, 28, 26,0.12)", color: "var(--color-sage)", border: "1px solid rgba(30, 28, 26,0.25)" }}>
            <span>{typeInfo.icon}</span>{typeInfo.label}
          </span>
          <div className="flex items-center gap-0.5 relative flex-shrink-0">
            {onConfigChange && (
              <div className="relative">
                <IconBtn onClick={() => setConfigOpen((v) => !v)} title="Chart settings">
                  <Settings className="w-3.5 h-3.5" />
                </IconBtn>
                {configOpen && (
                  <ChartConfigPanel
                    config={config}
                    currentType={chart.chartType}
                    onUpdate={(c) => { onConfigChange(c); }}
                    onClose={() => setConfigOpen(false)}
                  />
                )}
              </div>
            )}
            <IconBtn onClick={() => { if (chartAreaRef.current) exportChartAsPNG(chartAreaRef.current, chart.title); }} title="Download PNG">
              <Download className="w-3.5 h-3.5" />
            </IconBtn>
            <IconBtn onClick={() => setFullscreen(true)} title="Fullscreen">
              <Maximize2 className="w-3.5 h-3.5" />
            </IconBtn>
          </div>
        </div>

        <h3 className="text-base font-semibold mb-4" style={{ color: "var(--color-sage-dark)" }}>{chart.title}</h3>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border min-w-0"
            style={{ borderColor: "rgba(30, 28, 26, 0.2)", background: "rgba(255,255,255,0.2)" }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
            <input
              value={filterQuery}
              onChange={(e) => { setFilterQuery(e.target.value); setZoomOffset(0); }}
              placeholder={`Filter ${xKey}`}
              className="bg-transparent outline-none text-xs w-36"
              style={{ color: "var(--color-text-primary)" }}
            />
          </div>
          {isBrushable && zoomPercent < 100 && (
            <button
              onClick={() => { setZoomPercent(100); setZoomOffset(0); }}
              className="h-7 px-2.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 cursor-pointer"
              style={{ borderColor: "rgba(30, 28, 26, 0.2)", color: "var(--color-sage-dark)", background: "rgba(255,255,255,0.2)" }}
              title="Reset zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              Reset Zoom
            </button>
          )}
          <span className="text-[11px] ml-auto" style={{ color: "var(--color-text-muted)" }}>
            {displayData.length}/{filteredData.length}
          </span>
        </div>

        {isBrushable && filteredData.length > 10 && (
          <div className="mb-3 rounded-lg border px-2.5 py-2" style={{ borderColor: "rgba(30, 28, 26, 0.2)", background: "rgba(255,255,255,0.16)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Zoom</span>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={zoomPercent}
                onChange={(e) => {
                  setZoomPercent(Number(e.currentTarget.value));
                  setZoomOffset(0);
                }}
                className="flex-1"
                title="Zoom level"
              />
              <span className="text-[10px] w-10 text-right" style={{ color: "var(--color-text-muted)" }}>{zoomPercent}%</span>
            </div>

            {zoomPercent < 100 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Scroll</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, maxZoomOffset)}
                  step={1}
                  value={zoomOffset}
                  onChange={(e) => setZoomOffset(Number(e.currentTarget.value))}
                  className="flex-1"
                  title="Scroll zoomed window"
                />
              </div>
            )}
          </div>
        )}
        {chartContent(chartHeight)}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", animation: "fade-in 0.2s ease-out" }} onClick={() => setFullscreen(false)}>
          <div
            className="rounded-2xl shadow-2xl w-full max-w-4xl p-6"
            style={{
              background: "var(--color-card)",
              animation: "fade-in-scale 0.25s cubic-bezier(0.4,0,0.2,1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mr-2" style={{ background: "rgba(30, 28, 26,0.12)", color: "var(--color-sage)", border: "1px solid rgba(30, 28, 26,0.25)" }}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                <span className="text-lg font-semibold" style={{ color: "var(--color-sage-dark)" }}>{chart.title}</span>
              </div>
              <button onClick={() => setFullscreen(false)} className="p-2 rounded-xl cursor-pointer hover:opacity-60">
                <X className="w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
              </button>
            </div>
            {chartContent(500)}
          </div>
        </div>
      )}
    </>
  );
}
