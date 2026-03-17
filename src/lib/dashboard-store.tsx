"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type {
  DashboardState, Dataset, AnalyticsPlan, KPIResult,
  ChartResult, CSVRow, InsightPlan, QueryHistoryEntry, ChatMessage,
  ChartConfigOverride, FilterPlan, DashboardSnapshot, DataStory, ColumnStatSummary,
} from "@/types";

const SNAPSHOTS_KEY = "synq_snapshots";

function loadSnapshots(): DashboardSnapshot[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSnapshots(snaps: DashboardSnapshot[]) {
  try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps)); } catch { /* ignore */ }
}

export const initialDashboardState: DashboardState = {
  dataset: null,
  query: "",
  plan: null,
  kpis: [],
  charts: [],
  tableData: [],
  tableColumns: [],
  insights: [],
  isLoading: false,
  error: null,
  queryHistory: [],
  chatMessages: [],
  chartConfigs: {},
  activeFilters: [],
  snapshots: [],
  dataSmartSuggestions: [],
  dataStats: undefined,
  queryExecutionTime: undefined,
};

type DashboardAction =
  | { type: "SET_DATASET"; payload: Dataset }
  | { type: "SET_QUERY"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | {
      type: "SET_DASHBOARD_RESULTS";
      payload: {
        plan: AnalyticsPlan;
        kpis: KPIResult[];
        charts: ChartResult[];
        tableData: CSVRow[];
        tableColumns: string[];
        insights: InsightPlan[];
      };
    }
  | { type: "ADD_QUERY_HISTORY"; payload: QueryHistoryEntry }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "UPDATE_LAST_ASSISTANT_MESSAGE"; payload: Partial<ChatMessage> }
  | { type: "UPDATE_LAST_USER_MESSAGE"; payload: Partial<ChatMessage> }
  | { type: "SET_CHART_CONFIG"; payload: { index: number; config: ChartConfigOverride } }
  | { type: "SET_ACTIVE_FILTERS"; payload: FilterPlan[] }
  | { type: "SET_SMART_SUGGESTIONS"; payload: string[] }
  | { type: "SET_DATA_STATS"; payload: ColumnStatSummary[] }
  | { type: "SET_STORY"; payload: DataStory }
  | { type: "SET_QUERY_EXECUTION_TIME"; payload: number }
  | { type: "ADD_SNAPSHOT"; payload: DashboardSnapshot }
  | { type: "DELETE_SNAPSHOT"; payload: string }
  | { type: "LOAD_SNAPSHOT"; payload: DashboardSnapshot }
  | { type: "INIT_SNAPSHOTS" }
  | { type: "RESET" };

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "SET_DATASET":
      return { ...initialDashboardState, dataset: action.payload, snapshots: state.snapshots };
    case "SET_QUERY":
      return { ...state, query: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "SET_DASHBOARD_RESULTS":
      return { ...state, ...action.payload, isLoading: false, error: null, chartConfigs: {} };
    case "ADD_QUERY_HISTORY":
      return { ...state, queryHistory: [...state.queryHistory, action.payload] };
    case "ADD_CHAT_MESSAGE":
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case "UPDATE_LAST_ASSISTANT_MESSAGE": {
      const msgs = [...state.chatMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], ...action.payload };
          break;
        }
      }
      return { ...state, chatMessages: msgs };
    }
    case "UPDATE_LAST_USER_MESSAGE": {
      const msgs = [...state.chatMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "user") {
          msgs[i] = { ...msgs[i], ...action.payload };
          break;
        }
      }
      return { ...state, chatMessages: msgs };
    }
    case "SET_CHART_CONFIG":
      return {
        ...state,
        chartConfigs: { ...state.chartConfigs, [action.payload.index]: action.payload.config },
      };
    case "SET_ACTIVE_FILTERS":
      return { ...state, activeFilters: action.payload };
    case "SET_SMART_SUGGESTIONS":
      return { ...state, dataSmartSuggestions: action.payload };
    case "SET_DATA_STATS":
      return { ...state, dataStats: action.payload };
    case "SET_STORY":
      return { ...state, story: action.payload };
    case "SET_QUERY_EXECUTION_TIME":
      return { ...state, queryExecutionTime: action.payload };
    case "ADD_SNAPSHOT": {
      const updated = [action.payload, ...state.snapshots];
      saveSnapshots(updated);
      return { ...state, snapshots: updated };
    }
    case "DELETE_SNAPSHOT": {
      const updated = state.snapshots.filter((s) => s.id !== action.payload);
      saveSnapshots(updated);
      return { ...state, snapshots: updated };
    }
    case "LOAD_SNAPSHOT": {
      const snap = action.payload;
      return {
        ...state,
        plan: snap.plan,
        kpis: snap.kpis,
        charts: snap.charts,
        tableData: snap.tableData,
        tableColumns: snap.tableColumns,
        insights: snap.insights,
        chartConfigs: {},
        activeFilters: [],
      };
    }
    case "INIT_SNAPSHOTS":
      return { ...state, snapshots: loadSnapshots() };
    case "RESET":
      return { ...initialDashboardState, snapshots: state.snapshots };
    default:
      return state;
  }
}

const DashboardContext = createContext<{
  state: DashboardState;
  dispatch: Dispatch<DashboardAction>;
} | null>(null);

export { DashboardContext };

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within DashboardProvider");
  return context;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
}
