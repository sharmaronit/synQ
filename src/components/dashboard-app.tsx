"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-store";
import { useQueryHandler } from "@/hooks/use-query-handler";
import { computeDataStats } from "@/hooks/use-query-handler";
import { DEMO_DATASETS, loadDemoDataset } from "@/lib/sample-data";
import { executePlan } from "@/lib/query-engine";
import { exportDashboardAsPDF, exportChartAsSVG } from "@/lib/export-utils";
import { computeDataStatsInWorker, executePlanInWorker } from "@/lib/analytics-worker-client";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { Dataset, DashboardSnapshot, FilterPlan, DataStory, SavedDashboardRecord } from "@/types";

import { Navbar } from "@/components/navbar";
import { UploadZone } from "@/components/upload-zone";
import { DemoSelector } from "@/components/demo-selector";
import { KPICards } from "@/components/kpi-cards";
import { ChartsGrid } from "@/components/charts-grid";
import { DataTable } from "@/components/data-table";
import { LoadingOverlay } from "@/components/loading-overlay";
import { ChatPanel } from "@/components/chat-panel";
import { SynqLogo } from "@/components/synq-logo";
import { FilterBuilder } from "@/components/filter-builder";
import { DatasetOverview } from "@/components/dataset-overview";
import { StoryCard } from "@/components/story-card";
import { AutoSummary } from "@/components/auto-summary";
import { PerformanceMetrics } from "@/components/performance-metrics";
import { Columns3, X, MessageSquare } from "lucide-react";

function AppContent() {
  const { state, dispatch } = useDashboard();
  const { submitQuery } = useQueryHandler();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [resumeDashboard, setResumeDashboard] = useState<SavedDashboardRecord | null>(null);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(false);

  // Section refs for PDF export
  const kpiRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Fix 4: Warn before page unload so the user doesn't accidentally lose their dataset
  useEffect(() => {
    if (!state.dataset) {
      window.onbeforeunload = null;
      return;
    }
    window.onbeforeunload = (e) => {
      e.preventDefault();
      return "Your dataset will be lost if you leave. Are you sure?";
    };
    return () => { window.onbeforeunload = null; };
  }, [state.dataset]);

  // Init snapshots from localStorage on mount
  useEffect(() => {
    dispatch({ type: "INIT_SNAPSHOTS" });
  }, [dispatch]);

  useEffect(() => {
    const supabase = createSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const initializeDataset = useCallback((dataset: Dataset) => {
    dispatch({ type: "SET_DATASET", payload: dataset });

    computeDataStatsInWorker(dataset.rows, dataset.schema)
      .then((stats) => dispatch({ type: "SET_DATA_STATS", payload: stats }))
      .catch(() => dispatch({ type: "SET_DATA_STATS", payload: computeDataStats(dataset.rows, dataset.schema) }));

    // Compute smart suggestions from schema
    const cols = dataset.schema.columns;
    const numericCols = cols.filter((c) => c.type === "number");
    const dateCols = cols.filter((c) => c.type === "date");
    const strCols = cols.filter((c) => c.type === "string" && c.uniqueCount <= 15);

    const suggestions: string[] = [];
    if (dateCols.length > 0 && numericCols.length > 0)
      suggestions.push(`Show ${numericCols[0].name} trend over ${dateCols[0].name}`);
    if (strCols.length > 0 && numericCols.length > 0)
      suggestions.push(`Which ${strCols[0].name} has the highest ${numericCols[0].name}?`);
    if (numericCols.length >= 2)
      suggestions.push(`Compare ${numericCols[0].name} vs ${numericCols[1].name}`);
    suggestions.push("Give me a full overview of this dataset");

    dispatch({ type: "SET_SMART_SUGGESTIONS", payload: suggestions.slice(0, 4) });
  }, [dispatch]);

  const clearResumeState = useCallback(() => {
    setResumeDashboard(null);
    setResumeMessage(null);
    setResumeError(null);

    if (resumeId) {
      router.replace("/dashboard");
    }
  }, [resumeId, router]);

  const applySavedDashboardToDataset = useCallback(async (savedDashboard: SavedDashboardRecord, dataset: Dataset) => {
    dispatch({ type: "SET_LOADING", payload: true });
    setResumeError(null);

    try {
      const allColumns = dataset.schema.columns.map((column) => column.name);
      const results = await executePlanInWorker(dataset.rows, savedDashboard.plan, undefined, { allColumns }).catch(
        () => executePlan(dataset.rows, savedDashboard.plan, undefined, { allColumns })
      );

      dispatch({
        type: "SET_DASHBOARD_RESULTS",
        payload: {
          plan: savedDashboard.plan,
          kpis: results.kpis,
          charts: results.charts,
          tableData: results.tableData,
          tableColumns: results.tableColumns,
          insights: savedDashboard.insights,
        },
      });

      setResumeMessage(`Continuing \"${savedDashboard.name}\".`);
      router.replace("/dashboard");
    } catch {
      dispatch({ type: "SET_ERROR", payload: "Failed to restore the saved dashboard with this dataset." });
      setResumeError("We loaded the dataset, but the saved dashboard could not be rebuilt from it. Make sure you uploaded the original source file.");
    }
  }, [dispatch, router]);

  const handleDataLoaded = useCallback(async (dataset: Dataset) => {
    initializeDataset(dataset);

    if (resumeDashboard) {
      await applySavedDashboardToDataset(resumeDashboard, dataset);
    }
  }, [applySavedDashboardToDataset, initializeDataset, resumeDashboard]);

  useEffect(() => {
    if (!resumeId) return;

    let cancelled = false;

    async function loadSavedDashboard() {
      setIsLoadingResume(true);
      setResumeError(null);

      const response = await fetch(`/api/dashboards/${resumeId}`);
      const body = await response.json().catch(() => ({ message: "Failed to load saved dashboard." }));

      if (cancelled) return;

      if (!response.ok) {
        setResumeDashboard(null);
        setResumeError(body.message ?? "Failed to load saved dashboard.");
        setIsLoadingResume(false);
        return;
      }

      const dashboard = body.dashboard as SavedDashboardRecord;
      setResumeDashboard(dashboard);
      setResumeMessage(`Resume \"${dashboard.name}\" by loading ${dashboard.datasetName}.`);

      const matchingDemo = DEMO_DATASETS.find((demo) => demo.name === dashboard.datasetName);
      if (matchingDemo && !state.dataset) {
        const dataset = loadDemoDataset(matchingDemo.id);
        initializeDataset(dataset);
        await applySavedDashboardToDataset(dashboard, dataset);
      }

      setIsLoadingResume(false);
    }

    void loadSavedDashboard();

    return () => {
      cancelled = true;
    };
  }, [applySavedDashboardToDataset, initializeDataset, resumeId, state.dataset]);

  const handleReset = () => dispatch({ type: "RESET" });
  const handleChatSubmit = (query: string) => submitQuery(query, state.plan !== null);

  // Re-execute plan when active filters change
  const handleFilterChange = useCallback(async (filters: FilterPlan[]) => {
    dispatch({ type: "SET_ACTIVE_FILTERS", payload: filters });
    if (state.plan && state.dataset) {
      const dataset = state.dataset;
      const plan = state.plan;
      const results = await executePlanInWorker(state.dataset.rows, state.plan, filters).catch(
        () => executePlan(dataset.rows, plan, filters)
      );
      dispatch({
        type: "SET_DASHBOARD_RESULTS",
        payload: { plan, kpis: results.kpis, charts: results.charts, tableData: results.tableData, tableColumns: results.tableColumns, insights: state.insights },
      });
    }
  }, [state.plan, state.dataset, state.insights, dispatch]);

  // Snapshot save
  const handleSaveSnapshot = useCallback(async () => {
    if (!state.plan || !state.dataset) return;
    const name = window.prompt("Snapshot name:", `${state.plan.title} — ${new Date().toLocaleDateString()}`);
    if (!name) return;
    const snap: DashboardSnapshot = {
      id: crypto.randomUUID(),
      name,
      savedAt: new Date().toISOString(),
      datasetName: state.dataset.name,
      plan: state.plan,
      kpis: state.kpis,
      charts: state.charts,
      tableData: state.tableData,
      tableColumns: state.tableColumns,
      insights: state.insights,
    };
    dispatch({ type: "ADD_SNAPSHOT", payload: snap });

    const response = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: snap.name,
        datasetName: snap.datasetName,
        plan: snap.plan,
        kpis: snap.kpis,
        charts: snap.charts,
        tableColumns: snap.tableColumns,
        insights: snap.insights,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: "Failed to save dashboard" }));
      window.alert(body.message ?? "Failed to save dashboard");
      return;
    }

    window.alert("Dashboard saved to your account.");
  }, [state, dispatch]);

  const handleLoadSnapshot = useCallback((snap: DashboardSnapshot) => {
    dispatch({ type: "LOAD_SNAPSHOT", payload: snap });
  }, [dispatch]);

  const handleDeleteSnapshot = useCallback((id: string) => {
    dispatch({ type: "DELETE_SNAPSHOT", payload: id });
  }, [dispatch]);

  const handleViewChatDashboard = useCallback((snap: DashboardSnapshot) => {
    dispatch({ type: "LOAD_SNAPSHOT", payload: snap });
  }, [dispatch]);

  const handleOpenSavedDashboards = useCallback(() => {
    router.push("/dashboards");
  }, [router]);

  const handleSignOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const handleSwitchAccount = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  // PDF export
  const handleExportPDF = useCallback(async () => {
    const sections = [kpiRef.current, chartRef.current, tableRef.current, summaryRef.current].filter(Boolean) as HTMLElement[];
    await exportDashboardAsPDF(state.plan?.title ?? "synQ Dashboard", sections);
  }, [state.plan]);

  // SVG export
  const handleExportSVG = useCallback(async () => {
    if (!chartRef.current) return;
    await exportChartAsSVG(chartRef.current, state.plan?.title ?? "synQ_Chart");
  }, [state.plan]);

  // AI Data Story
  const handleGenerateStory = useCallback(async () => {
    if (!state.dataset) return;
    const dataset = state.dataset;

    setIsGeneratingStory(true);
    try {
      const dataStats = state.dataStats
        ?? await computeDataStatsInWorker(dataset.rows, dataset.schema).catch(
          () => computeDataStats(dataset.rows, dataset.schema)
        );
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: dataset.schema,
          dataStats,
          datasetName: dataset.name,
          kpis: state.kpis,
          insights: state.insights,
        }),
      });
      if (response.ok) {
        const data: { story: DataStory } = await response.json();
        dispatch({ type: "SET_STORY", payload: data.story });
        setShowStory(true);
      }
    } catch { /* silently ignore */ } finally {
      setIsGeneratingStory(false);
    }
  }, [state.dataset, state.dataStats, state.kpis, state.insights, dispatch]);

  const samplePrompts = state.dataSmartSuggestions.length > 0
    ? state.dataSmartSuggestions
    : state.dataset?.source === "demo"
    ? DEMO_DATASETS.find((d) => d.name === state.dataset?.name)?.samplePrompts ?? []
    : ["Give me an overview of this data", "Show the top categories by total", "What trends do you see?", "Break down by the main category"];

  // Section label helper
  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
        {children}
      </div>
    );
  }

  // Upload Mode
  if (!state.dataset) {
    const matchingDemo = resumeDashboard
      ? DEMO_DATASETS.find((demo) => demo.name === resumeDashboard.datasetName)
      : null;

    return (
      <div className="upload-animated-bg min-h-screen relative">
        <div className="absolute top-0 left-0 right-0 px-4 pt-3 pb-2 z-50 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[1280px] mx-auto">
            <Navbar
              userEmail={userEmail}
              onHome={() => router.push("/dashboard")}
              onOpenSavedDashboards={handleOpenSavedDashboards}
              onSwitchAccount={handleSwitchAccount}
              onSignOut={handleSignOut}
            />
          </div>
        </div>

        <div className="min-h-screen flex items-center justify-center p-4 pt-24">
          <div className="w-full max-w-3xl" style={{ animation: "fade-in-scale 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}>
            {(resumeDashboard || resumeError || isLoadingResume) && (
              <div className="mb-6 rounded-2xl p-5 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)", boxShadow: "0 14px 36px rgba(30, 28, 26, 0.10)" }}>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-sage-dark)" }}>
                  Continue Saved Dashboard
                </h2>
                {isLoadingResume && (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    Loading your saved dashboard...
                  </p>
                )}
                {!isLoadingResume && resumeMessage && (
                  <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                    {resumeMessage}
                  </p>
                )}
                {!isLoadingResume && resumeDashboard && !matchingDemo && (
                  <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                    Upload the original dataset used for this dashboard to continue exploring it in the workspace.
                  </p>
                )}
                {!isLoadingResume && matchingDemo && (
                  <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                    This dashboard was built from a demo dataset, so synQ can restore it automatically.
                  </p>
                )}
                {resumeError && (
                  <p className="text-sm mb-3" style={{ color: "var(--color-danger)" }}>
                    {resumeError}
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  {matchingDemo && !state.dataset && !isLoadingResume && resumeDashboard && (
                    <button
                      onClick={async () => {
                        const dataset = loadDemoDataset(matchingDemo.id);
                        initializeDataset(dataset);
                        await applySavedDashboardToDataset(resumeDashboard, dataset);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                      style={{ background: "var(--color-sage)", color: "white" }}
                    >
                      Load Demo and Continue
                    </button>
                  )}
                  {resumeId && (
                    <button
                      onClick={clearResumeState}
                      className="px-4 py-2 rounded-lg text-sm font-semibold border cursor-pointer"
                      style={{ borderColor: "var(--color-surface-border)", color: "var(--color-sage-dark)", background: "rgba(255,255,255,0.7)" }}
                    >
                      Start Fresh
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <SynqLogo className="w-10 h-10" />
                <h1 className="text-4xl font-bold" style={{ color: "var(--color-sage)" }}>synQ</h1>
              </div>
              <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>
                Ask questions about your data. Get instant dashboards.
              </p>
            </div>
            <UploadZone onDataLoaded={handleDataLoaded} />
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "1px solid var(--color-surface-border)" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-sm font-medium" style={{ background: "var(--color-background)", color: "var(--color-text-muted)" }}>
                  Or try a demo dataset
                </span>
              </div>
            </div>
            <DemoSelector onDataLoaded={handleDataLoaded} />
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Mode
  return (
    <div className="upload-animated-bg flex flex-col relative" style={{ height: "100dvh" }}>
      {/* Main content that flows behind navbar */}
      <div className="flex flex-1 min-h-0">
        <main
          className="flex-1 overflow-y-auto px-5 pt-20 pb-4"
          style={{
            background: "transparent"
          }}
        >
          {state.isLoading && !state.plan && <LoadingOverlay message="Analyzing your data..." isVisible={true} />}

          {!state.plan && !state.isLoading && (
            <div className="flex items-center justify-center min-h-full py-6" style={{ animation: "fade-in 0.4s ease-out" }}>
              <DatasetOverview dataset={state.dataset} />
            </div>
          )}

          {state.plan && (
            <div className="w-full max-w-[1200px] mx-auto" style={{ animation: "fade-in-scale 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              {/* Header */}
              <div className="mb-5">
                {resumeMessage && (
                  <div className="mb-3 rounded-xl px-4 py-3 border text-sm" style={{ background: "rgba(250,246,240,0.72)", borderColor: "var(--color-surface-border)", color: "var(--color-text-muted)" }}>
                    {resumeMessage}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="text-2xl font-bold" style={{ color: "var(--color-sage-dark)" }}>{state.plan.title}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsChatOpen((v) => !v)}
                      className="h-8 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all duration-150"
                      style={{
                        background: isChatOpen ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.22)",
                        color: "var(--color-sage-dark)",
                        borderColor: "var(--color-surface-border)",
                      }}
                      title={isChatOpen ? "Hide chat" : "Show chat"}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isChatOpen ? "Hide Chat" : "Show Chat"}
                    </button>
                    <button
                      onClick={() => setShowColumnsModal(true)}
                      className="h-8 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all duration-150"
                      style={{
                        background: "rgba(255, 255, 255, 0.35)",
                        color: "var(--color-sage-dark)",
                        borderColor: "var(--color-surface-border)",
                      }}
                      title="View dataset columns"
                    >
                      <Columns3 className="w-3.5 h-3.5" />
                      Columns
                    </button>
                    <PerformanceMetrics executionTime={state.queryExecutionTime} />
                  </div>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>{state.plan.description}</p>
              </div>

              {/* KPI cards — full width */}
              {state.kpis.length > 0 && (
                <div ref={kpiRef} className="mb-6">
                  <KPICards
                    kpis={state.kpis}
                    isLoading={false}
                    rows={state.dataset.rows}
                    schema={state.dataset.schema.columns}
                  />
                </div>
              )}

              {/* Filters */}
              <div className="mb-6">
                <FilterBuilder
                  schema={state.dataset.schema}
                  filters={state.activeFilters}
                  onChange={handleFilterChange}
                />
              </div>

              {state.isLoading && <LoadingOverlay message="Updating dashboard..." isVisible={true} />}

              {!state.isLoading && (
                <>
                  {state.charts.length > 0 && (
                    <div className="mb-6" ref={chartRef}>
                      <SectionLabel>Charts</SectionLabel>
                      <ChartsGrid charts={state.charts} isLoading={false} />
                    </div>
                  )}

                  {state.tableData.length > 0 && (
                    <div className="mb-6" ref={tableRef}>
                      <SectionLabel>Data</SectionLabel>
                      <DataTable
                        data={state.tableData}
                        columns={state.tableColumns}
                        title={state.plan.table?.title ?? "Data"}
                        isLoading={false}
                        allRows={state.dataset.rows}
                        schema={state.dataset.schema.columns}
                      />
                    </div>
                  )}

                  {/* Auto-generated summary */}
                  {state.plan && state.kpis.length > 0 && (
                    <div className="mb-6" ref={summaryRef}>
                      <AutoSummary
                        plan={state.plan}
                        kpis={state.kpis}
                        insights={state.insights}
                      />
                    </div>
                  )}

                  {/* AI Data Story card */}
                  {showStory && state.story && (
                    <div className="mb-6">
                      <StoryCard story={state.story} onClose={() => setShowStory(false)} />
                      <div className="mt-2 flex justify-center">
                        <button
                          onClick={() => { setShowStory(false); setIsGeneratingStory(false); handleGenerateStory(); }}
                          className="text-xs cursor-pointer transition-opacity"
                          style={{ color: "var(--color-text-muted)", opacity: 0.6 }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                        >
                          ↺ Regenerate story
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>

        {isChatOpen && (
          <div
            className="w-[380px] lg:w-[420px] xl:w-[460px] flex-shrink-0 hidden md:flex flex-col pt-4 pb-1"
            style={{
              background: "transparent"
            }}
          >
            <ChatPanel
              onSubmit={handleChatSubmit}
              isLoading={state.isLoading}
              messages={state.chatMessages}
              samplePrompts={samplePrompts}
              onViewDashboard={handleViewChatDashboard}
            />
          </div>
        )}
      </div>

      {showColumnsModal && state.dataset && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowColumnsModal(false)}
        >
          <div
            className="w-full max-w-[1200px] max-h-[90vh] overflow-auto rounded-2xl p-4"
            style={{
              background: "linear-gradient(145deg, rgba(250,246,240,0.94) 0%, rgba(232,223,210,0.9) 100%)",
              border: "1px solid var(--color-surface-border)",
              boxShadow: "0 30px 70px rgba(0,0,0,0.32)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={() => setShowColumnsModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                style={{ color: "var(--color-text-muted)", background: "rgba(30,28,26,0.08)" }}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DatasetOverview dataset={state.dataset} />
          </div>
        </div>
      )}

      {/* Floating navbar positioned over everything */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-3 pb-2 z-50 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[1280px] mx-auto">
          <Navbar
            datasetName={state.dataset.name}
            userEmail={userEmail}
            onReset={handleReset}
            snapshots={state.snapshots}
            onSaveSnapshot={state.plan ? handleSaveSnapshot : undefined}
            onLoadSnapshot={handleLoadSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
            onExportPDF={state.plan ? handleExportPDF : undefined}
            onExportSVG={state.plan ? handleExportSVG : undefined}
            onGenerateStory={state.plan ? handleGenerateStory : undefined}
            isGeneratingStory={isGeneratingStory}
            onOpenSavedDashboards={handleOpenSavedDashboards}
            onSwitchAccount={handleSwitchAccount}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardApp() {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  );
}
