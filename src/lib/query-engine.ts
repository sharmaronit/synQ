import type {
  CSVRow, AnalyticsPlan, KPIPlan, KPIResult,
  ChartPlan, ChartResult, ChartDataPoint, FilterPlan, TablePlan,
} from "@/types";

const MAX_CHART_POINTS = 300;

function applyFilters(rows: CSVRow[], filters: FilterPlan[]): CSVRow[] {
  return rows.filter((row) =>
    filters.every((f) => {
      const val = row[f.column];
      if (val === null || val === undefined) return false;
      const strVal = String(val).trim().toLowerCase();
      const strFilter = String(f.value).trim().toLowerCase();
      switch (f.operator) {
        case "eq":  return strVal === strFilter;
        case "neq": return strVal !== strFilter;
        case "gt":  return Number(val) > Number(f.value);
        case "gte": return Number(val) >= Number(f.value);
        case "lt":  return Number(val) < Number(f.value);
        case "lte": return Number(val) <= Number(f.value);
        case "contains": return strVal.includes(strFilter);
        case "in":
          return Array.isArray(f.value) &&
            f.value.some((v) => String(v).trim().toLowerCase() === strVal);
        default: return true;
      }
    })
  );
}

function aggregate(values: (string | number | null)[], aggregation: string): number {
  const nums = values
    .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
    .filter((n) => !isNaN(n));

  switch (aggregation) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "min": return nums.length > 0 ? Math.min(...nums) : 0;
    case "max": return nums.length > 0 ? Math.max(...nums) : 0;
    case "count": return values.filter((v) => v !== null && v !== undefined).length;
    case "countDistinct": return new Set(values.filter((v) => v !== null)).size;
    default: return values.length;
  }
}

export function computeKPIs(rows: CSVRow[], kpiPlans: KPIPlan[]): KPIResult[] {
  return kpiPlans.map((kpi) => {
    const values = rows.map((r) => r[kpi.column]);
    const rawValue = aggregate(values, kpi.aggregation);

    let displayValue: string;
    if (kpi.format === "currency") {
      displayValue = `${kpi.prefix ?? "$"}${rawValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (kpi.format === "percent") {
      displayValue = `${rawValue.toFixed(1)}${kpi.suffix ?? "%"}`;
    } else {
      displayValue = rawValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    return { label: kpi.label, value: displayValue, rawValue, format: kpi.format, prefix: kpi.prefix, suffix: kpi.suffix };
  });
}

export function computeChartData(rows: CSVRow[], chartPlan: ChartPlan): ChartResult {
  let filteredRows = chartPlan.filters ? applyFilters(rows, chartPlan.filters) : rows;

  const groups = new Map<string, CSVRow[]>();
  filteredRows.forEach((row) => {
    const key = String(row[chartPlan.xColumn] ?? "Unknown");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  });

  let dataPoints: ChartDataPoint[] = [];
  groups.forEach((groupRows, label) => {
    const yValues = groupRows.map((r) => r[chartPlan.yColumn]);
    const value = aggregate(yValues, chartPlan.yAggregation);
    dataPoints.push({ label, value });
  });

  if (chartPlan.sortBy) {
    switch (chartPlan.sortBy) {
      case "value-desc": dataPoints.sort((a, b) => b.value - a.value); break;
      case "value-asc": dataPoints.sort((a, b) => a.value - b.value); break;
      case "label-asc": dataPoints.sort((a, b) => a.label.localeCompare(b.label)); break;
      case "label-desc": dataPoints.sort((a, b) => b.label.localeCompare(a.label)); break;
    }
  }

  if (chartPlan.limit && chartPlan.limit > 0) {
    dataPoints = dataPoints.slice(0, chartPlan.limit);
  } else if (dataPoints.length > MAX_CHART_POINTS) {
    dataPoints = dataPoints.slice(0, MAX_CHART_POINTS);
  }

  return { title: chartPlan.title, chartType: chartPlan.chartType, data: dataPoints, xKey: "label", yKey: "value" };
}

export function computeTableData(
  rows: CSVRow[],
  tablePlan: TablePlan,
  allColumns?: string[]
): { data: CSVRow[]; columns: string[] } {
  let filteredRows = tablePlan.filters ? applyFilters(rows, tablePlan.filters) : [...rows];

  if (tablePlan.sortBy) {
    const col = tablePlan.sortBy;
    const order = tablePlan.sortOrder === "desc" ? -1 : 1;
    filteredRows.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * order;
      return String(va ?? "").localeCompare(String(vb ?? "")) * order;
    });
  }

  // No row limit — return all filtered rows; UI handles pagination
  // No column projection — return full row objects so all keys are available
  return { data: filteredRows, columns: allColumns ?? tablePlan.columns };
}

export function executePlan(
  rows: CSVRow[],
  plan: AnalyticsPlan,
  extraFilters?: FilterPlan[],
  options?: { allColumns?: string[] }
): { kpis: KPIResult[]; charts: ChartResult[]; tableData: CSVRow[]; tableColumns: string[]; filteredRowCount: number } {
  let filteredRows = plan.filters ? applyFilters(rows, plan.filters) : rows;
  if (extraFilters && extraFilters.length > 0) {
    filteredRows = applyFilters(filteredRows, extraFilters);
  }

  const kpis = computeKPIs(filteredRows, plan.kpis);
  const charts = plan.charts.map((cp) => computeChartData(filteredRows, cp));

  let tableData: CSVRow[] = [];
  let tableColumns: string[] = [];
  if (plan.table) {
    const tableResult = computeTableData(filteredRows, plan.table, options?.allColumns);
    tableData = tableResult.data;
    tableColumns = tableResult.columns;
  }

  return { kpis, charts, tableData, tableColumns, filteredRowCount: filteredRows.length };
}
