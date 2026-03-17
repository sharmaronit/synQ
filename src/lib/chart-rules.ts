import type { ColumnSchema, ChartPlan } from "@/types";

export function validateChartType(
  chart: ChartPlan,
  xCol: ColumnSchema,
  yCol: ColumnSchema
): ChartPlan["chartType"] {
  const proposed = chart.chartType;

  if (xCol.type === "date") {
    if (proposed === "pie" || proposed === "donut" || proposed === "horizontal-bar") return "line";
    return proposed;
  }

  if (xCol.type === "number" && yCol.type === "number") {
    if (proposed === "pie" || proposed === "donut") return "scatter";
    return proposed;
  }

  if (xCol.type === "string") {
    if (xCol.uniqueCount <= 6 && (proposed === "pie" || proposed === "donut")) return proposed;
    if (xCol.uniqueCount > 12 && proposed !== "horizontal-bar") return "horizontal-bar";
    if (proposed === "pie" || proposed === "donut") return "bar";
    if (proposed === "line" || proposed === "area") return "bar";
  }

  return proposed;
}

export function enforceChartRules(
  charts: ChartPlan[],
  columnMap: Map<string, ColumnSchema>
): ChartPlan[] {
  return charts.map((chart) => {
    const xCol = columnMap.get(chart.xColumn);
    const yCol = columnMap.get(chart.yColumn);
    if (!xCol || !yCol) return chart;
    const correctedType = validateChartType(chart, xCol, yCol);
    return { ...chart, chartType: correctedType };
  });
}
