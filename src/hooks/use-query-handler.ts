"use client";

import { useCallback, useRef } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { executePlan } from "@/lib/query-engine";
import { enforceChartRules } from "@/lib/chart-rules";
import { globalUsageTracker } from "@/lib/usage-tracker";
import { generateFallbackPlan, classifyError } from "@/lib/error-handlers";
import type { QueryRequest, QueryResponse, ColumnSchema, KPIResult, ChartResult, ColumnStatSummary, CSVRow, DatasetSchema, DashboardSnapshot, AnalyticsPlan, InsightPlan } from "@/types";
import { executeSQL, deriveKPIsFromSQL, deriveChartsFromSQL, buildAnswerFromSQL } from "@/lib/sql-engine";
import { computeDataStatsInWorker, executePlanInWorker } from "@/lib/analytics-worker-client";

const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });

function normalizeColName(v: string): string {
  return v.toLowerCase().replace(/[_\s]+/g, "").trim();
}

function resolveColumnByPhrase(schema: DatasetSchema, phrase: string): string | null {
  const needle = normalizeColName(phrase);
  if (!needle) return null;

  const exact = schema.columns.find((c) => normalizeColName(c.name) === needle);
  if (exact) return exact.name;

  const includes = schema.columns.find((c) => normalizeColName(c.name).includes(needle) || needle.includes(normalizeColName(c.name)));
  return includes?.name ?? null;
}

function buildFallbackChartsFromFocus(
  rows: CSVRow[],
  schema: DatasetSchema,
  focus: string | undefined,
  requestedCount: number | null
): ChartResult[] {
  if (!focus) return [];

  const parts = focus.split(/\s+vs\s+|\s+by\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];

  const colA = resolveColumnByPhrase(schema, parts[0]);
  const colB = parts[1] ? resolveColumnByPhrase(schema, parts[1]) : null;
  if (!colA) return [];

  const targetCount = Math.min(Math.max(requestedCount ?? 1, 1), 3);

  // Chart 1: colA distribution
  const countA = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[colA] ?? "Unknown");
    countA.set(key, (countA.get(key) ?? 0) + 1);
  }
  const chartAData = [...countA.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([label, value]) => ({ label, value }));

  const charts: ChartResult[] = [{
    title: `${colA} Distribution`,
    chartType: "bar",
    data: chartAData,
    xKey: "label",
    yKey: "value",
  }];

  // Chart 2: colA vs colB combination counts (when both are categorical)
  if (targetCount >= 2 && colB) {
    const countPair = new Map<string, number>();
    for (const row of rows) {
      const a = String(row[colA] ?? "Unknown");
      const b = String(row[colB] ?? "Unknown");
      const key = `${a} · ${b}`;
      countPair.set(key, (countPair.get(key) ?? 0) + 1);
    }
    const chartPairData = [...countPair.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 30)
      .map(([label, value]) => ({ label, value }));

    charts.push({
      title: `${colA} vs ${colB} (Count)`,
      chartType: "horizontal-bar",
      data: chartPairData,
      xKey: "label",
      yKey: "value",
    });
  }

  // Chart 3: secondary column distribution
  if (targetCount >= 3 && colB) {
    const countB = new Map<string, number>();
    for (const row of rows) {
      const key = String(row[colB] ?? "Unknown");
      countB.set(key, (countB.get(key) ?? 0) + 1);
    }
    const chartBData = [...countB.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([label, value]) => ({ label, value }));

    charts.push({
      title: `${colB} Distribution`,
      chartType: "bar",
      data: chartBData,
      xKey: "label",
      yKey: "value",
    });
  }

  return charts.slice(0, targetCount);
}

export function computeDataStats(rows: CSVRow[], schema: DatasetSchema): ColumnStatSummary[] {
  return schema.columns.map((col) => {
    if (col.type === "number") {
      let sum = 0, min = Infinity, max = -Infinity, count = 0;
      for (const row of rows) {
        const v = Number(row[col.name]);
        if (!isNaN(v) && row[col.name] !== null && row[col.name] !== "") {
          sum += v; if (v < min) min = v; if (v > max) max = v; count++;
        }
      }
      return {
        name: col.name, type: col.type,
        sum: Math.round(sum * 100) / 100,
        min: count > 0 ? Math.round(min * 100) / 100 : 0,
        max: count > 0 ? Math.round(max * 100) / 100 : 0,
        mean: count > 0 ? Math.round(sum / count * 100) / 100 : 0,
      };
    }
    if (col.type === "string") {
      const counts: Record<string, number> = {};
      for (const row of rows) {
        const v = row[col.name];
        if (v !== null && v !== "") counts[String(v)] = (counts[String(v)] || 0) + 1;
      }
      const total = rows.length;
      const topValues = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, pct: Math.round((count / total) * 1000) / 10 }));
      return { name: col.name, type: col.type, topValues };
    }
    if (col.type === "date") {
      const dates = rows.map((r) => r[col.name]).filter((v) => v !== null && v !== "").map(String).sort();
      return {
        name: col.name, type: col.type,
        dateRange: dates.length > 0 ? { min: dates[0], max: dates[dates.length - 1] } : undefined,
      };
    }
    return { name: col.name, type: col.type };
  });
}

function buildFactualAnswer(
  kpis: KPIResult[],
  charts: ChartResult[],
  aiAnswer: string,
  tableRowCount?: number
): string {
  const lines: string[] = [];

  // Prepend row count only when plan.filters are present (caller decides — no regex guessing)
  if (tableRowCount !== undefined && tableRowCount > 0) {
    lines.push(`Found **${tableRowCount.toLocaleString()} matching rows**. See the table for details.`);
  }

  // Lead with the AI's answer — always trust it (grounded in real stats via the prompt)
  if (aiAnswer && aiAnswer.length > 3 && !aiAnswer.startsWith("Auto-generated")) {
    lines.push(aiAnswer);
  }

  // Always append computed KPIs as machine-verified numbers
  if (kpis.length > 0) {
    const kpiBlock = kpis.map((k) => `**${k.label}:** ${k.value}`).join("  ·  ");
    lines.push(kpiBlock);
  }

  // Pure fallback if nothing above produced output
  if (lines.length === 0 && charts[0]?.data.length > 0) {
    const sorted = [...charts[0].data].sort((a, b) => Number(b.value) - Number(a.value));
    const top    = sorted[0];
    lines.push(`**${top.label}:** ${fmt(Number(top.value))}`);
  }

  return lines.join("\n\n") || aiAnswer || "Dashboard generated from your data.";
}

export function useQueryHandler() {
  const { state, dispatch } = useDashboard();
  const controllerRef = useRef<AbortController | null>(null);

  const buildResponseSnapshot = useCallback((
    query: string,
    plan: AnalyticsPlan,
    kpis: KPIResult[],
    charts: ChartResult[],
    tableData: CSVRow[],
    tableColumns: string[],
    insights: InsightPlan[]
  ): DashboardSnapshot | null => {
    if (!state.dataset) return null;
    return {
      id: crypto.randomUUID(),
      name: query.length > 70 ? `${query.slice(0, 67)}...` : query,
      savedAt: new Date().toISOString(),
      datasetName: state.dataset.name,
      plan,
      kpis,
      charts,
      tableData,
      tableColumns,
      insights,
    };
  }, [state.dataset]);

  const submitQuery = useCallback(
    async (query: string, isFollowUp: boolean = false) => {
      if (!state.dataset) {
        dispatch({ type: "SET_ERROR", payload: "No dataset loaded. Please upload a CSV first." });
        return;
      }

      const startTime = performance.now();
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      dispatch({ type: "ADD_CHAT_MESSAGE", payload: { id: crypto.randomUUID(), role: "user", content: query, timestamp: new Date().toISOString() } });
      dispatch({
        type: "ADD_CHAT_MESSAGE",
        payload: { id: crypto.randomUUID(), role: "assistant", content: "", timestamp: new Date().toISOString(), isLoading: true, loadingStep: "Analyzing your dataset...", doneSteps: [] },
      });
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_QUERY", payload: query });

      const isAddChartsCommand =
        !!state.plan &&
        /^Add\s+[123]\s+additional\s+chart(?:s)?\s+to\s+the\s+current\s+dashboard\b/i.test(query.trim());
      const requestedAddChartCount = query.match(/^Add\s+([123])\s+additional\s+chart(?:s)?\b/i)?.[1]
        ? Number(query.match(/^Add\s+([123])\s+additional\s+chart(?:s)?\b/i)?.[1])
        : null;
      const addChartFocus = query.match(/focused on\s+(.+?)\.?$/i)?.[1]?.trim();

      // Accumulates completed steps shown in the thinking panel
      const done: string[] = [];
      const pushStep = (next: string) => {
        dispatch({
          type: "UPDATE_LAST_ASSISTANT_MESSAGE",
          payload: { loadingStep: next, doneSteps: [...done] },
        });
      };
      const completeStep = (label: string, next: string) => {
        done.push(label);
        pushStep(next);
      };

      try {
        const { rowCount } = state.dataset.schema;
        const colCount  = state.dataset.schema.columns.length;
        completeStep(
          `Dataset loaded — ${rowCount.toLocaleString()} rows, ${colCount} columns`,
          "Consulting AI about your question..."
        );

        let dataStats = state.dataStats;
        if (!dataStats) {
          try {
            dataStats = await computeDataStatsInWorker(state.dataset.rows, state.dataset.schema);
          } catch {
            dataStats = computeDataStats(state.dataset.rows, state.dataset.schema);
          }
          dispatch({ type: "SET_DATA_STATS", payload: dataStats });
        }

        const requestBody: QueryRequest = {
          query,
          schema: state.dataset.schema,
          previousPlan: isFollowUp ? (state.plan ?? undefined) : undefined,
          isFollowUp,
          dataStats,
        };

        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        completeStep("AI generated plan", "Processing response...");
        const data: QueryResponse = await response.json();

        globalUsageTracker.addRequest(query, JSON.stringify(data.plan));

        const cols        = state.dataset.schema.columns;
        const numericCols = cols.filter((c) => c.type === "number").map((c) => c.name);
        const stringCols  = cols.filter((c) => c.type === "string" && c.uniqueCount <= 20).map((c) => c.name);
        const dateCols    = cols.filter((c) => c.type === "date").map((c) => c.name);

        const suggestions: string[] = [];
        if (dateCols.length > 0 && numericCols.length > 0) suggestions.push(`Show ${numericCols[0]} trend over ${dateCols[0]}`);
        if (stringCols.length > 0 && numericCols.length > 0) suggestions.push(`Which ${stringCols[0]} has the highest ${numericCols[0]}?`);
        if (numericCols.length > 1) suggestions.push(`Compare ${numericCols[0]} vs ${numericCols[1]}`);
        if (stringCols.length > 0) suggestions.push(`Break down by ${stringCols[0]}`);
        if (suggestions.length < 3) suggestions.push("Show top 10 rows by value", "Give me a summary of all key metrics");

        if (data.sqlPlan) {
          // ── SQL PATH (GitHub / Gemini) ────────────────────────────────────
          completeStep("AI generated SQL query", "Executing SQL against dataset...");
          const sqlResult    = await executeSQL(data.sqlPlan.sql, state.dataset.rows);
          const kpis         = deriveKPIsFromSQL(sqlResult);
          const sqlCharts    = deriveChartsFromSQL(sqlResult, data.sqlPlan);
          const fallbackCharts = isAddChartsCommand && sqlCharts.length === 0
            ? buildFallbackChartsFromFocus(state.dataset.rows, state.dataset.schema, addChartFocus, requestedAddChartCount)
            : [];
          const charts       = sqlCharts.length > 0 ? sqlCharts : fallbackCharts;
          const tableData    = sqlResult.error ? state.dataset.rows.slice(0, 500) : sqlResult.rows;
          const tableColumns = sqlResult.columns.length > 0
            ? sqlResult.columns
            : state.dataset.schema.columns.map((c) => c.name);
          const answerText   = sqlResult.error
            ? `SQL error: ${sqlResult.error}`
            : buildAnswerFromSQL(sqlResult, query, data.sqlPlan);

          done.push(`SQL executed — ${kpis.length} KPIs, ${charts.length} charts`);
          dispatch({ type: "UPDATE_LAST_ASSISTANT_MESSAGE", payload: { loadingStep: "Building your dashboard...", doneSteps: [...done] } });

          const executionTime = Math.round(performance.now() - startTime);

          const mergedCharts = isAddChartsCommand ? [...state.charts, ...charts] : charts;
          const mergedInsights = isAddChartsCommand ? [...state.insights, ...data.plan.insights] : data.plan.insights;
          const mergedPlan = isAddChartsCommand && state.plan
            ? {
                ...state.plan,
                charts: [...state.plan.charts, ...data.plan.charts],
                insights: [...state.plan.insights, ...data.plan.insights],
              }
            : data.plan;

          const nextKpis = isAddChartsCommand ? state.kpis : kpis;
          const nextTableData = isAddChartsCommand ? state.tableData : tableData;
          const nextTableColumns = isAddChartsCommand ? state.tableColumns : tableColumns;

          dispatch({
            type: "SET_DASHBOARD_RESULTS",
            payload: {
              plan: mergedPlan,
              kpis: nextKpis,
              charts: mergedCharts,
              tableData: nextTableData,
              tableColumns: nextTableColumns,
              insights: mergedInsights,
            },
          });
          dispatch({ type: "SET_QUERY_EXECUTION_TIME", payload: executionTime });
          dispatch({ type: "ADD_QUERY_HISTORY", payload: { id: crypto.randomUUID(), query, timestamp: new Date().toISOString(), plan: mergedPlan } });

          const responseSnapshot = buildResponseSnapshot(query, mergedPlan, nextKpis, mergedCharts, nextTableData, nextTableColumns, mergedInsights);
          if (responseSnapshot) {
            dispatch({ type: "UPDATE_LAST_USER_MESSAGE", payload: { responseSnapshot } });
          }

          const messageContent = isAddChartsCommand
            ? `Added **${charts.length}** of **${requestedAddChartCount ?? charts.length}** requested chart${(requestedAddChartCount ?? charts.length) !== 1 ? "s" : ""} to your current dashboard${addChartFocus ? `, focused on ${addChartFocus}` : ""}.`
            : answerText;

          dispatch({
            type: "UPDATE_LAST_ASSISTANT_MESSAGE",
            payload: {
              content: messageContent,
              sql: data.sqlPlan.sql,
              isLoading: false, loadingStep: undefined, doneSteps: undefined,
              suggestions: suggestions.slice(0, 3),
              showGraphButton: mergedCharts.length === 0,
              stats: { charts: mergedCharts.length, kpis: nextKpis.length, insights: mergedInsights.length },
            },
          });

        } else {
          // ── MOCK PATH (no API key) — unchanged ───────────────────────────
          const columnMap = new Map<string, ColumnSchema>();
          state.dataset.schema.columns.forEach((col) => columnMap.set(col.name, col));
          data.plan.charts = enforceChartRules(data.plan.charts, columnMap);

          completeStep("Schema validated — running computations...", "Computing results...");
          const allColumns = state.dataset.schema.columns.map((c) => c.name);
          const results = await executePlanInWorker(state.dataset.rows, data.plan, undefined, { allColumns }).catch(
            () => executePlan(state.dataset.rows, data.plan, undefined, { allColumns })
          );

          done.push(`Results computed — ${results.kpis.length} KPIs, ${results.charts.length} charts`);
          dispatch({ type: "UPDATE_LAST_ASSISTANT_MESSAGE", payload: { loadingStep: "Building your dashboard...", doneSteps: [...done] } });

          const executionTime = Math.round(performance.now() - startTime);

          const mergedCharts = isAddChartsCommand ? [...state.charts, ...results.charts] : results.charts;
          const mergedInsights = isAddChartsCommand ? [...state.insights, ...data.plan.insights] : data.plan.insights;
          const mergedPlan = isAddChartsCommand && state.plan
            ? {
                ...state.plan,
                charts: [...state.plan.charts, ...data.plan.charts],
                insights: [...state.plan.insights, ...data.plan.insights],
              }
            : data.plan;

          const nextKpis = isAddChartsCommand ? state.kpis : results.kpis;
          const nextTableData = isAddChartsCommand ? state.tableData : results.tableData;
          const nextTableColumns = isAddChartsCommand ? state.tableColumns : results.tableColumns;

          dispatch({
            type: "SET_DASHBOARD_RESULTS",
            payload: {
              plan: mergedPlan,
              kpis: nextKpis,
              charts: mergedCharts,
              tableData: nextTableData,
              tableColumns: nextTableColumns,
              insights: mergedInsights,
            },
          });
          dispatch({ type: "SET_QUERY_EXECUTION_TIME", payload: executionTime });
          dispatch({ type: "ADD_QUERY_HISTORY", payload: { id: crypto.randomUUID(), query, timestamp: new Date().toISOString(), plan: mergedPlan } });

          const responseSnapshot = buildResponseSnapshot(
            query,
            mergedPlan,
            nextKpis,
            mergedCharts,
            nextTableData,
            nextTableColumns,
            mergedInsights,
          );
          if (responseSnapshot) {
            dispatch({ type: "UPDATE_LAST_USER_MESSAGE", payload: { responseSnapshot } });
          }

          const kpiCount     = nextKpis.length;
          const chartCount   = mergedCharts.length;
          const insightCount = mergedInsights.length;

          const hasFilters = (data.plan.filters?.length ?? 0) > 0;
          const answerText = buildFactualAnswer(
            results.kpis, results.charts,
            data.plan.answer ?? data.plan.description,
            hasFilters ? results.filteredRowCount : undefined,
          );

          const messageContent = isAddChartsCommand
            ? `Added **${results.charts.length}** of **${requestedAddChartCount ?? results.charts.length}** requested chart${(requestedAddChartCount ?? results.charts.length) !== 1 ? "s" : ""} to your current dashboard${addChartFocus ? `, focused on ${addChartFocus}` : ""}.`
            : answerText;

          dispatch({
            type: "UPDATE_LAST_ASSISTANT_MESSAGE",
            payload: {
              content: messageContent,
              isLoading: false, loadingStep: undefined, doneSteps: undefined,
              suggestions: suggestions.slice(0, 3),
              showGraphButton: chartCount === 0,
              stats: { charts: chartCount, kpis: kpiCount, insights: insightCount },
            },
          });
        }

      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        const classified = classifyError(error);

        if (classified.canRetry && state.dataset) {
          done.push("AI unavailable — generating fallback...");
          pushStep("Generating fallback dashboard...");
          const fallbackPlan = generateFallbackPlan(state.dataset.schema);
          const fallbackResults = await executePlanInWorker(state.dataset.rows, fallbackPlan).catch(
            () => executePlan(state.dataset.rows, fallbackPlan)
          );
          dispatch({
            type: "SET_DASHBOARD_RESULTS",
            payload: {
              plan: fallbackPlan,
              kpis: fallbackResults.kpis,
              charts: fallbackResults.charts,
              tableData: fallbackResults.tableData,
              tableColumns: fallbackResults.tableColumns,
              insights: fallbackPlan.insights,
            },
          });
          const responseSnapshot = buildResponseSnapshot(
            query,
            fallbackPlan,
            fallbackResults.kpis,
            fallbackResults.charts,
            fallbackResults.tableData,
            fallbackResults.tableColumns,
            fallbackPlan.insights,
          );
          if (responseSnapshot) {
            dispatch({ type: "UPDATE_LAST_USER_MESSAGE", payload: { responseSnapshot } });
          }
          dispatch({
            type: "UPDATE_LAST_ASSISTANT_MESSAGE",
            payload: {
              content: `⚠️ ${classified.message}\n\nShowing an auto-generated overview of your data instead.`,
              isLoading: false,
              loadingStep: undefined,
              doneSteps: undefined,
              suggestions: ["Try rephrasing your question", "Show me a summary", "What columns are available?"],
            },
          });
        } else {
          const message = error instanceof Error ? error.message : "Query failed";
          dispatch({ type: "UPDATE_LAST_ASSISTANT_MESSAGE", payload: { content: `❌ ${classified.message || message}`, isLoading: false, loadingStep: undefined, doneSteps: undefined } });
          dispatch({ type: "SET_ERROR", payload: classified.message || message });
        }
      }
    },
    [
      state.dataset,
      state.plan,
      state.charts,
      state.kpis,
      state.tableData,
      state.tableColumns,
      state.insights,
      state.dataStats,
      dispatch,
      buildResponseSnapshot,
    ]
  );

  return { submitQuery };
}

