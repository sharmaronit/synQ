"use client";

import { useState } from "react";
import { X, ExternalLink, AlertCircle } from "lucide-react";
import { globalUsageTracker } from "@/lib/usage-tracker";

interface UsageStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageStatsModal({ isOpen, onClose }: UsageStatsModalProps) {
  const stats = globalUsageTracker.getStats();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold" style={{ color: "var(--color-sage-dark)" }}>
            Token Usage Stats
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg cursor-pointer transition-opacity hover:opacity-70"
          >
            <X className="w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Total Requests */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(30, 28, 26,0.1)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              Requests
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-sage)" }}>
              {stats.totalRequests}
            </p>
          </div>

          {/* Estimated Cost */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(30, 28, 26,0.1)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              Est. Cost
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-sage)" }}>
              ${stats.estimatedCost.toFixed(4)}
            </p>
          </div>

          {/* Input Tokens */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(30, 28, 26,0.05)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              Input Tokens
            </p>
            <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {stats.estimatedInputTokens.toLocaleString()}
            </p>
          </div>

          {/* Output Tokens */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(30, 28, 26,0.05)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              Output Tokens
            </p>
            <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {stats.estimatedOutputTokens.toLocaleString()}
            </p>
          </div>

          {/* Total Tokens Full Width */}
          <div
            className="col-span-2 p-4 rounded-xl"
            style={{ background: "rgba(30, 28, 26,0.05)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              Total Tokens
            </p>
            <p className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {stats.estimatedTotalTokens.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Warning Info */}
        <div
          className="flex gap-2 p-3 rounded-lg mb-5"
          style={{ background: "rgba(251,191,36,0.1)" }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            These are <strong>session estimates</strong> based on text length. For accurate usage, check your GitHub billing page.
          </p>
        </div>

        {/* GitHub Button */}
        <a
          href="https://github.com/settings/billing/summary"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-white font-semibold cursor-pointer transition-all duration-200"
          style={{ background: "var(--color-sage)", boxShadow: "var(--shadow-btn)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-sage-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-sage)")}
        >
          <ExternalLink className="w-4 h-4" />
          View Actual Usage on GitHub
        </a>
      </div>
    </div>
  );
}
