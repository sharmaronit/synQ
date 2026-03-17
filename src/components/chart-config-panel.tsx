"use client";

import { useEffect, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { ChartConfigOverride, ChartPlan, ReferenceLine } from "@/types";

const CHART_TYPES: { type: ChartPlan["chartType"]; icon: string; label: string }[] = [
  { type: "bar", icon: "▊", label: "Bar" },
  { type: "horizontal-bar", icon: "▬", label: "H-Bar" },
  { type: "line", icon: "↗", label: "Line" },
  { type: "area", icon: "◭", label: "Area" },
  { type: "pie", icon: "◔", label: "Pie" },
  { type: "donut", icon: "◎", label: "Donut" },
  { type: "scatter", icon: "⁙", label: "Scatter" },
];

interface ChartConfigPanelProps {
  config: ChartConfigOverride;
  currentType: ChartPlan["chartType"];
  onUpdate: (c: ChartConfigOverride) => void;
  onClose: () => void;
}

export function ChartConfigPanel({ config, currentType, onUpdate, onClose }: ChartConfigPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const effectiveType = config.chartType ?? currentType;
  const lines: ReferenceLine[] = config.referenceLines ?? [];

  function addLine() {
    const newLine: ReferenceLine = { id: crypto.randomUUID(), label: "Target", value: 0, color: "#d63031" };
    onUpdate({ ...config, referenceLines: [...lines, newLine] });
  }

  function updateLine(id: string, field: keyof ReferenceLine, val: string | number) {
    onUpdate({
      ...config,
      referenceLines: lines.map((l) => (l.id === id ? { ...l, [field]: val } : l)),
    });
  }

  function removeLine(id: string) {
    onUpdate({ ...config, referenceLines: lines.filter((l) => l.id !== id) });
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-8 z-30 w-64 rounded-2xl border p-4 shadow-2xl"
      style={{
        background: "rgba(255,255,255,0.97)",
        borderColor: "rgba(30, 28, 26,0.2)",
        animation: "slide-down 0.18s ease",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "var(--color-sage-dark)" }}>Chart Settings</span>
        <button onClick={onClose} className="p-0.5 rounded cursor-pointer hover:opacity-60">
          <X className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>

      {/* Chart type */}
      <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Chart Type</p>
      <div className="grid grid-cols-4 gap-1 mb-3">
        {CHART_TYPES.map(({ type, icon, label }) => (
          <button
            key={type}
            onClick={() => onUpdate({ ...config, chartType: type })}
            className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-xs cursor-pointer transition-all"
            style={{
              background: effectiveType === type ? "rgba(30, 28, 26,0.2)" : "transparent",
              color: effectiveType === type ? "var(--color-sage)" : "var(--color-text-muted)",
              border: effectiveType === type ? "1px solid rgba(30, 28, 26,0.4)" : "1px solid transparent",
            }}
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2 mb-3">
        {[
          { key: "swapAxes" as const, label: "Swap X/Y axes" },
          { key: "hideGrid" as const, label: "Hide gridlines" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</span>
            <button
              onClick={() => onUpdate({ ...config, [key]: !config[key] })}
              className="w-9 h-5 rounded-full relative transition-colors duration-200"
              style={{ background: config[key] ? "var(--color-sage)" : "rgba(30, 28, 26,0.2)" }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: config[key] ? "18px" : "2px" }}
              />
            </button>
          </label>
        ))}
      </div>

      {/* Reference lines */}
      <div className="border-t pt-3" style={{ borderColor: "var(--color-surface-border)" }}>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Reference Lines</p>
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center gap-1.5">
              <input
                className="flex-1 text-xs px-2 py-1 rounded-lg border outline-none min-w-0"
                style={{ borderColor: "var(--color-surface-border)", background: "var(--color-surface)" }}
                placeholder="Label"
                value={line.label}
                onChange={(e) => updateLine(line.id, "label", e.target.value)}
              />
              <input
                type="number"
                className="w-16 text-xs px-2 py-1 rounded-lg border outline-none"
                style={{ borderColor: "var(--color-surface-border)", background: "var(--color-surface)" }}
                placeholder="Value"
                value={line.value}
                onChange={(e) => updateLine(line.id, "value", parseFloat(e.target.value) || 0)}
              />
              <button onClick={() => removeLine(line.id)} className="cursor-pointer hover:opacity-60 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#d63031" }} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addLine}
          className="mt-2 flex items-center gap-1 text-xs cursor-pointer hover:opacity-80"
          style={{ color: "var(--color-sage)" }}
        >
          <Plus className="w-3 h-3" /> Add reference line
        </button>
      </div>
    </div>
  );
}
