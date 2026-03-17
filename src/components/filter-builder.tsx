"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { DatasetSchema, FilterPlan } from "@/types";

const OPERATORS: { value: FilterPlan["operator"]; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "contains" },
];

interface FilterBuilderProps {
  schema: DatasetSchema;
  filters: FilterPlan[];
  onChange: (filters: FilterPlan[]) => void;
}

export function FilterBuilder({ schema, filters, onChange }: FilterBuilderProps) {
  const [open, setOpen] = useState(false);

  function addFilter() {
    const firstCol = schema.columns[0];
    onChange([...filters, { column: firstCol.name, operator: "eq", value: "" }]);
    setOpen(true);
  }

  function updateFilter(index: number, update: Partial<FilterPlan>) {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...update } : f)));
  }

  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }

  const activeCount = filters.length;

  return (
    <div
      className="inline-block rounded-xl border overflow-hidden"
      style={{
        borderColor: "var(--color-surface-border)",
        background: "rgba(250, 246, 240, 0.80)",
        backdropFilter: "blur(8px)"
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer transition-colors hover:bg-[rgba(30, 28, 26,0.05)]"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--color-sage-dark)" }}>Filters</span>
          {activeCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "var(--color-sage)", color: "white" }}
            >
              {activeCount}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
        )}
      </button>

      {/* Filter rows */}
      {open && (
        <div className="px-4 pb-3 border-t space-y-2 pt-3" style={{ borderColor: "var(--color-surface-border)" }}>
          {filters.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              {/* Column */}
              <select
                className="flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none cursor-pointer min-w-0"
                style={{ borderColor: "var(--color-surface-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                value={f.column}
                onChange={(e) => updateFilter(i, { column: e.target.value })}
              >
                {schema.columns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                className="text-sm px-2 py-1.5 rounded-lg border outline-none cursor-pointer w-24 flex-shrink-0"
                style={{ borderColor: "var(--color-surface-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                value={f.operator}
                onChange={(e) => updateFilter(i, { operator: e.target.value as FilterPlan["operator"] })}
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value */}
              <input
                className="w-28 text-sm px-2 py-1.5 rounded-lg border outline-none flex-shrink-0"
                style={{ borderColor: "var(--color-surface-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                placeholder="Value"
                value={String(f.value)}
                onChange={(e) => updateFilter(i, { value: e.target.value })}
              />

              <button
                onClick={() => removeFilter(i)}
                className="p-1 rounded cursor-pointer hover:opacity-60 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
              </button>
            </div>
          ))}

          <button
            onClick={addFilter}
            className="flex items-center gap-1.5 text-sm cursor-pointer mt-1"
            style={{ color: "var(--color-sage)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Filter
          </button>
        </div>
      )}
    </div>
  );
}
