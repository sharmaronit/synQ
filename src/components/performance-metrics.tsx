"use client";

interface PerformanceMetricsProps {
  executionTime?: number;
}

export function PerformanceMetrics({ executionTime }: PerformanceMetricsProps) {
  if (!executionTime) return null;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: "rgba(30, 28, 26, 0.06)",
        color: "var(--color-text-muted)",
        border: "1px solid rgba(30, 28, 26, 0.1)",
      }}
    >
      <span>⚡ Query executed in {executionTime}ms</span>
    </div>
  );
}
