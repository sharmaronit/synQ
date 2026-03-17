"use client";

import { AlertCircle, X, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl mb-4 border"
      style={{
        background: "rgba(214,48,49,0.08)",
        borderColor: "rgba(214,48,49,0.2)",
        color: "var(--color-danger)",
        animation: "slide-down 0.2s ease",
      }}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold mb-0.5">Something went wrong</p>
        <p className="text-sm opacity-90">{error}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: "var(--color-danger)" }}
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: "var(--color-danger)" }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
