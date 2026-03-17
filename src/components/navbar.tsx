"use client";

import { useState, useRef, useEffect } from "react";
import { SynqLogo } from "@/components/synq-logo";
import { MoreHorizontal, TrendingUp, FileDown, Bookmark, Trash2, RotateCcw, Sparkles, Loader2, FolderOpen, LogOut, ArrowLeftRight } from "lucide-react";
import { UsageStatsModal } from "@/components/usage-stats-modal";
import type { DashboardSnapshot } from "@/types";

interface NavbarProps {
  datasetName?: string | null;
  onReset?: () => void;
  snapshots?: DashboardSnapshot[];
  onSaveSnapshot?: () => void;
  onLoadSnapshot?: (snap: DashboardSnapshot) => void;
  onDeleteSnapshot?: (id: string) => void;
  onExportPDF?: () => void;
  onExportSVG?: () => void;
  onGenerateStory?: () => void;
  isGeneratingStory?: boolean;
  onOpenSavedDashboards?: () => void;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
  onHome?: () => void;
  userEmail?: string | null;
}

export function Navbar({ datasetName, onReset, snapshots = [], onSaveSnapshot, onLoadSnapshot, onDeleteSnapshot, onExportPDF, onExportSVG, onGenerateStory, isGeneratingStory = false, onOpenSavedDashboards, onSignOut, onSwitchAccount, onHome, userEmail }: NavbarProps) {
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isClickableLogo = Boolean(onReset || onHome);

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  return (
    <>
      <UsageStatsModal isOpen={usageModalOpen} onClose={() => setUsageModalOpen(false)} />

      <nav
        className="rounded-[24px] w-full relative"
        style={{
          background: "rgba(250, 246, 240, 0.16)",
          backdropFilter: "blur(30px) saturate(180%) brightness(108%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%) brightness(108%)",
          border: "1px solid rgba(255, 255, 255, 0.48)",
          boxShadow: `
            0 10px 30px rgba(30, 28, 26, 0.10),
            0 1px 2px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.85),
            inset 0 -1px 0 rgba(255, 255, 255, 0.20)
          `,
          animation: "nav-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Glass reflection effect */}
        <div
          className="absolute inset-0 rounded-[24px] pointer-events-none overflow-hidden"
          style={{
            background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 2px, rgba(255,255,255,0.02) 2px 4px), radial-gradient(130% 130% at 0% 0%, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.12) 36%, rgba(255,255,255,0) 58%), linear-gradient(135deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.05) 54%, rgba(255,255,255,0.16) 100%)",
            opacity: 0.88,
          }}
        />

        <div className="px-6 h-[60px] flex items-center justify-between w-full relative z-10">
          {/* Left — Logo */}
          <div
            className={`flex items-center gap-3 flex-shrink-0 group ${isClickableLogo ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => {
              if (onReset) {
                onReset();
                return;
              }
              onHome?.();
            }}
          >
            <div className="transition-transform duration-200 group-hover:scale-105">
              <SynqLogo className="w-7 h-7" />
            </div>
            <span
              className="text-base font-bold tracking-tight transition-colors duration-200"
              style={{
                color: "var(--color-sage)",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }}
            >
              synQ
            </span>
          </div>

          {/* Center — Dataset chip */}
          {datasetName && (
            <div
              className="hidden sm:flex items-center px-4 py-2 rounded-full text-xs font-semibold max-w-[240px] truncate backdrop-blur-sm"
              style={{
                background: "rgba(30, 28, 26, 0.08)",
                color: "var(--color-text-primary)",
                border: "1px solid rgba(30, 28, 26, 0.15)",
                boxShadow: "0 2px 8px rgba(30, 28, 26, 0.1)",
              }}
            >
              {datasetName}
            </div>
          )}

          {/* Right — Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {userEmail && (
              <div
                className="hidden md:flex items-center px-4 py-2 rounded-full text-xs font-semibold max-w-[240px] truncate"
                style={{
                  background: "rgba(30, 28, 26, 0.08)",
                  color: "var(--color-text-primary)",
                  border: "1px solid rgba(30, 28, 26, 0.15)",
                  boxShadow: "0 2px 8px rgba(30, 28, 26, 0.08)",
                }}
                title={userEmail}
              >
                {userEmail}
              </div>
            )}

            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 group"
                style={{
                  background: "rgba(30, 28, 26, 0.9)",
                  color: "white",
                  boxShadow: "0 4px 16px rgba(30, 28, 26, 0.3), 0 1px 2px rgba(0,0,0,0.2)",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(30, 28, 26, 1)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(30, 28, 26, 0.9)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" />
                New Dataset
              </button>
            )}

            {onSaveSnapshot && (
              <button
                onClick={onSaveSnapshot}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background: "rgba(30, 28, 26, 0.08)",
                  color: "var(--color-text-primary)",
                  border: "1px solid rgba(30, 28, 26, 0.15)",
                  boxShadow: "0 2px 8px rgba(30, 28, 26, 0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(30, 28, 26, 0.12)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(30, 28, 26, 0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save
              </button>
            )}

            {onGenerateStory && (
              <button
                onClick={onGenerateStory}
                disabled={isGeneratingStory}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  cursor: !isGeneratingStory ? "pointer" : "not-allowed",
                  background: !isGeneratingStory
                    ? "linear-gradient(135deg, var(--color-sage) 0%, var(--color-sage-dark) 100%)"
                    : "linear-gradient(135deg, rgba(30, 28, 26, 0.3) 0%, rgba(30, 28, 26, 0.2) 100%)",
                  color: !isGeneratingStory ? "white" : "rgba(255, 255, 255, 0.5)",
                  border: "none",
                  boxShadow: !isGeneratingStory ? "0 4px 16px rgba(30, 28, 26, 0.2)" : "0 2px 8px rgba(30, 28, 26, 0.08)",
                }}
                onMouseEnter={(e) => {
                  if (!isGeneratingStory) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(30, 28, 26, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGeneratingStory) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(30, 28, 26, 0.2)";
                  }
                }}
              >
                {isGeneratingStory ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isGeneratingStory ? "Generating..." : "Generate Story"}
              </button>
            )}

            <div ref={menuRef} className="relative">
              <button
                onClick={(event) => {
                  if (!menuOpen) {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setMenuPosition({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right,
                    });
                  }
                  setMenuOpen((value) => !value);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all duration-200"
                style={{
                  background: menuOpen ? "rgba(30, 28, 26, 0.12)" : "rgba(255, 255, 255, 0.1)",
                  border: menuOpen ? "1px solid rgba(30, 28, 26, 0.2)" : "1px solid rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(8px)",
                  color: menuOpen ? "var(--color-sage)" : "var(--color-text-muted)",
                  boxShadow: menuOpen ? "0 4px 12px rgba(30, 28, 26, 0.15)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!menuOpen) {
                    e.currentTarget.style.background = "rgba(30, 28, 26, 0.08)";
                    e.currentTarget.style.color = "var(--color-sage)";
                    e.currentTarget.style.border = "1px solid rgba(30, 28, 26, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!menuOpen) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.color = "var(--color-text-muted)";
                    e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.2)";
                  }
                }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && menuPosition && (
                <div
                  className="fixed w-64 rounded-2xl overflow-y-auto"
                  style={{
                    background: "rgba(250, 246, 240, 0.98)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: "1px solid var(--color-surface-border)",
                    boxShadow: "0 20px 60px rgba(30, 28, 26, 0.25), 0 4px 16px rgba(30, 28, 26, 0.15)",
                    animation: "slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    pointerEvents: "auto",
                    zIndex: 1000,
                    top: `${menuPosition.top}px`,
                    right: `${menuPosition.right}px`,
                    maxHeight: "calc(100vh - 100px)",
                  }}
                >
                  <button
                    onClick={() => {
                      setUsageModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-all duration-150"
                    style={{ color: "var(--color-text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                    API Usage
                  </button>

                  {onExportPDF && (
                    <button
                      onClick={() => {
                        onExportPDF();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-all duration-150"
                      style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FileDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      Export as PDF
                    </button>
                  )}

                  {onExportSVG && (
                    <button
                      onClick={() => {
                        onExportSVG();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-all duration-150"
                      style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FileDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      Export as SVG
                    </button>
                  )}

                  {onOpenSavedDashboards && (
                    <button
                      onClick={() => {
                        onOpenSavedDashboards();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-all duration-150"
                      style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      My Dashboards
                    </button>
                  )}

                  {onSaveSnapshot && (
                    <>
                      <div className="h-px mx-4 my-2" style={{ background: "rgba(30, 28, 26, 0.1)" }} />

                      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                          Snapshots
                        </span>
                        {snapshots.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(30, 28, 26, 0.1)", color: "var(--color-text-muted)" }}>
                            {snapshots.length}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onSaveSnapshot();
                          setMenuOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-150"
                        style={{ color: "var(--color-sage)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Bookmark className="w-4 h-4 flex-shrink-0" />
                        Save Current
                      </button>

                      {snapshots.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto border-t" style={{ borderColor: "rgba(30, 28, 26, 0.1)" }}>
                          {snapshots.map((snap) => (
                            <div
                              key={snap.id}
                              className="flex items-center gap-2 px-4 py-2.5 group"
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.04)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  onLoadSnapshot?.(snap);
                                  setMenuOpen(false);
                                }}
                              >
                                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                                  {snap.name}
                                </p>
                                <p className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
                                  {snap.datasetName} · {new Date(snap.savedAt).toLocaleDateString()}
                                </p>
                              </div>
                              {onDeleteSnapshot && (
                                <button
                                  onClick={() => onDeleteSnapshot(snap.id)}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-150"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--color-danger)" }} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-4 py-3 text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                          No saved snapshots yet
                        </p>
                      )}
                    </>
                  )}

                  {(onSwitchAccount || onSignOut) && <div className="h-px mx-4 my-2" style={{ background: "rgba(30, 28, 26, 0.1)" }} />}

                  {onSwitchAccount && (
                    <button
                      onClick={() => {
                        onSwitchAccount();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-all duration-150"
                      style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <ArrowLeftRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      Switch Account
                    </button>
                  )}

                  {onSignOut && (
                    <button
                      onClick={() => {
                        onSignOut();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-all duration-150"
                      style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 28, 26, 0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      Sign out
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}