import type { AnalyticsPlan, DatasetSchema, KPIPlan } from "@/types";

export function generateMockPlan(query: string, schema: DatasetSchema): AnalyticsPlan {
  const numericCols = schema.columns.filter((c) => c.type === "number");
  const stringCols = schema.columns.filter((c) => c.type === "string");
  const dateCols = schema.columns.filter((c) => c.type === "date");

  const kpis: KPIPlan[] = numericCols.slice(0, 3).map((col) => ({
    label: `Total ${col.name.replace(/_/g, " ")}`,
    column: col.name,
    aggregation: "sum" as const,
    format: "number" as const,
  }));

  if (numericCols.length > 0) {
    kpis.push({
      label: `Avg ${numericCols[0].name.replace(/_/g, " ")}`,
      column: numericCols[0].name,
      aggregation: "avg" as const,
      format: "number" as const,
    });
  }

  const charts: AnalyticsPlan["charts"] = [];

  if (stringCols.length > 0 && numericCols.length > 0) {
    charts.push({
      title: `${numericCols[0].name.replace(/_/g, " ")} by ${stringCols[0].name.replace(/_/g, " ")}`,
      chartType: "bar",
      xColumn: stringCols[0].name,
      yColumn: numericCols[0].name,
      yAggregation: "sum",
      sortBy: "value-desc",
      limit: 20,
    });
  }

  if (dateCols.length > 0 && numericCols.length > 0) {
    charts.push({
      title: `${numericCols[0].name.replace(/_/g, " ")} Over Time`,
      chartType: "line",
      xColumn: dateCols[0].name,
      yColumn: numericCols[0].name,
      yAggregation: "sum",
    });
  }

  const pieCandidates = stringCols.filter((c) => c.uniqueCount <= 8 && c.uniqueCount > 1);
  if (pieCandidates.length > 0 && numericCols.length > 0) {
    charts.push({
      title: `${numericCols[0].name.replace(/_/g, " ")} Distribution`,
      chartType: "donut",
      xColumn: pieCandidates[0].name,
      yColumn: numericCols[0].name,
      yAggregation: "sum",
    });
  }

  if (numericCols.length >= 2) {
    charts.push({
      title: `${numericCols[0].name.replace(/_/g, " ")} vs ${numericCols[1].name.replace(/_/g, " ")}`,
      chartType: "scatter",
      xColumn: numericCols[0].name,
      yColumn: numericCols[1].name,
      yAggregation: "sum",
    });
  }

  const tableColumns = schema.columns.map((c) => c.name);

  const queryLower = query.toLowerCase();
  const title = queryLower.includes("overview") || queryLower.includes("analyze")
    ? "Data Overview Dashboard"
    : `Analysis: ${query.slice(0, 60)}`;

  return {
    title,
    description: `Auto-generated analysis of ${schema.rowCount} rows across ${schema.columns.length} columns (mock mode).`,
    kpis: kpis.slice(0, 4),
    charts: charts.slice(0, 4),
    table: { title: "Data Sample", columns: tableColumns },
    insights: [
      { text: `Dataset contains ${schema.rowCount} rows and ${schema.columns.length} columns.`, type: "observation" },
      { text: numericCols.length > 0 ? `Primary numeric field: ${numericCols[0].name}` : "No numeric columns detected.", type: "observation" },
      { text: stringCols.length > 0 ? `${stringCols[0].name} has ${stringCols[0].uniqueCount} unique values.` : "No categorical columns detected.", type: "observation" },
      { text: "This is a mock analysis. Connect a Gemini API key for AI-powered insights.", type: "recommendation" },
    ],
  };
}
