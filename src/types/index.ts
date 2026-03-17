export type CSVRow = Record<string, string | number | null>;

export interface ColumnSchema {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  sampleValues: (string | number | null)[];
  nullCount: number;
  uniqueCount: number;
}

export interface DatasetSchema {
  columns: ColumnSchema[];
  rowCount: number;
  inferredAt: string;
}

export interface Dataset {
  name: string;
  rows: CSVRow[];
  schema: DatasetSchema;
  source: "upload" | "demo";
}

export interface KPIPlan {
  label: string;
  column: string;
  aggregation: "sum" | "avg" | "count" | "min" | "max" | "countDistinct";
  format?: "currency" | "number" | "percent";
  prefix?: string;
  suffix?: string;
}

export interface ChartPlan {
  title: string;
  chartType: "bar" | "line" | "pie" | "area" | "horizontal-bar" | "scatter" | "donut";
  xColumn: string;
  yColumn: string;
  yAggregation: "sum" | "avg" | "count" | "min" | "max";
  groupBy?: string;
  sortBy?: "value-asc" | "value-desc" | "label-asc" | "label-desc";
  limit?: number;
  filters?: FilterPlan[];
}

export interface FilterPlan {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string | number | (string | number)[];
}

export interface TablePlan {
  title: string;
  columns: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  filters?: FilterPlan[];
}

export interface InsightPlan {
  text: string;
  type: "observation" | "trend" | "anomaly" | "recommendation";
}

// Returned by AI in SQL mode — client executes the SQL via AlaSQL
export interface SQLQueryPlan {
  sql: string;
  title: string;
  description: string;
  chartType: "bar" | "horizontal-bar" | "line" | "area" | "pie" | "donut" | "scatter" | "none";
  xColumn?: string;   // column in SQL result for chart X axis
  yColumn?: string;   // column in SQL result for chart Y axis
  insights: { text: string; type: "observation" | "trend" | "anomaly" | "recommendation" }[];
}

export interface AnalyticsPlan {
  title: string;
  description: string;
  answer?: string;
  kpis: KPIPlan[];
  charts: ChartPlan[];
  table?: TablePlan;
  insights: InsightPlan[];
  filters?: FilterPlan[];
}

export interface KPIResult {
  label: string;
  value: string;
  rawValue?: number;
  format?: "currency" | "number" | "percent";
  prefix?: string;
  suffix?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartResult {
  title: string;
  chartType: ChartPlan["chartType"];
  data: ChartDataPoint[];
  xKey: string;
  yKey: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isLoading?: boolean;
  loadingStep?: string;
  doneSteps?: string[];
  suggestions?: string[];
  showGraphButton?: boolean;
  stats?: { charts: number; kpis: number; insights: number };
  sql?: string;
  responseSnapshot?: DashboardSnapshot;
}

// --- New professional feature types ---

export interface DataStory {
  title: string;
  executive_summary: string;
  key_findings: string[];
  anomalies: string[];
  recommendations: string[];
  conclusion: string;
}

export interface ReferenceLine {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface ChartConfigOverride {
  chartType?: ChartPlan["chartType"];
  swapAxes?: boolean;
  hideGrid?: boolean;
  referenceLines?: ReferenceLine[];
}

export interface ColumnStats {
  name: string;
  type: string;
  count: number;
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  histogram?: { bin: string; count: number }[];
  topValues?: { value: string; count: number }[];
}

export interface DashboardSnapshot {
  id: string;
  name: string;
  savedAt: string;
  datasetName: string;
  plan: AnalyticsPlan;
  kpis: KPIResult[];
  charts: ChartResult[];
  tableData: CSVRow[];
  tableColumns: string[];
  insights: InsightPlan[];
}

export interface SavedDashboardPayload {
  name: string;
  datasetName: string;
  plan: AnalyticsPlan;
  kpis: KPIResult[];
  charts: ChartResult[];
  tableColumns: string[];
  insights: InsightPlan[];
}

export interface SavedDashboardSummary {
  id: string;
  name: string;
  datasetName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedDashboardRecord extends SavedDashboardSummary {
  plan: AnalyticsPlan;
  kpis: KPIResult[];
  charts: ChartResult[];
  tableColumns: string[];
  insights: InsightPlan[];
}

export interface DashboardState {
  dataset: Dataset | null;
  query: string;
  plan: AnalyticsPlan | null;
  kpis: KPIResult[];
  charts: ChartResult[];
  tableData: CSVRow[];
  tableColumns: string[];
  insights: InsightPlan[];
  isLoading: boolean;
  error: string | null;
  queryHistory: QueryHistoryEntry[];
  chatMessages: ChatMessage[];
  // Professional features
  chartConfigs: Record<number, ChartConfigOverride>;
  activeFilters: FilterPlan[];
  snapshots: DashboardSnapshot[];
  dataSmartSuggestions: string[];
  dataStats?: ColumnStatSummary[];
  story?: DataStory;
  queryExecutionTime?: number; // in milliseconds
}

export interface QueryHistoryEntry {
  id: string;
  query: string;
  timestamp: string;
  plan: AnalyticsPlan;
}

export interface ColumnStatSummary {
  name: string;
  type: string;
  sum?: number;
  min?: number;
  max?: number;
  mean?: number;
  topValues?: { value: string; pct: number }[];
  dateRange?: { min: string; max: string };
}

export interface QueryRequest {
  query: string;
  schema: DatasetSchema;
  previousPlan?: AnalyticsPlan;
  isFollowUp: boolean;
  dataStats?: ColumnStatSummary[];
}

export interface QueryResponse {
  plan: AnalyticsPlan;       // always present; stub (empty kpis/charts) in SQL mode
  sqlPlan?: SQLQueryPlan;    // present in SQL mode; absent in mock mode
  validationErrors: string[];
}

export interface APIError {
  message: string;
  code: "GEMINI_ERROR" | "VALIDATION_ERROR" | "PARSE_ERROR" | "SCHEMA_ERROR";
  details?: string;
}
