import type { AnalyticsPlan, DatasetSchema } from "@/types";

export function generateFallbackPlan(schema: DatasetSchema): AnalyticsPlan {
  const numericCols = schema.columns.filter((c) => c.type === "number");
  const stringCols = schema.columns.filter((c) => c.type === "string");
  const dateCols = schema.columns.filter((c) => c.type === "date");

  const kpis = numericCols.slice(0, 4).map((col) => ({
    label: `Total ${col.name.replace(/_/g, " ")}`,
    column: col.name,
    aggregation: "sum" as const,
    format: "number" as const,
  }));

  const charts: AnalyticsPlan["charts"] = [];

  if (stringCols.length > 0 && numericCols.length > 0) {
    charts.push({
      title: `${numericCols[0].name} by ${stringCols[0].name}`,
      chartType: "bar",
      xColumn: stringCols[0].name,
      yColumn: numericCols[0].name,
      yAggregation: "sum",
      sortBy: "value-desc",
      limit: 10,
    });
  }

  if (dateCols.length > 0 && numericCols.length > 0) {
    charts.push({
      title: `${numericCols[0].name} over ${dateCols[0].name}`,
      chartType: "line",
      xColumn: dateCols[0].name,
      yColumn: numericCols[0].name,
      yAggregation: "sum",
    });
  }

  return {
    title: "Data Overview (Auto-Generated)",
    description: "This dashboard was auto-generated because the AI analysis was unavailable.",
    kpis,
    charts,
    table: {
      title: "Raw Data Sample",
      columns: schema.columns.slice(0, 5).map((c) => c.name),
      limit: 20,
    },
    insights: [
      { text: `Dataset contains ${schema.rowCount} rows and ${schema.columns.length} columns.`, type: "observation" },
      { text: "This is an auto-generated fallback. Try rephrasing your question.", type: "recommendation" },
    ],
  };
}

export function classifyError(error: unknown): { title: string; message: string; canRetry: boolean } {
  if (error instanceof Error) {
    if (error.message.includes("Gemini") || error.message.includes("API")) {
      return { title: "AI Service Unavailable", message: "The AI service could not process your request. A basic dashboard has been generated instead.", canRetry: true };
    }
    if (error.message.includes("JSON")) {
      return { title: "Response Parse Error", message: "The AI returned an unexpected format. Please try rephrasing your question.", canRetry: true };
    }
    if (error.message.includes("schema") || error.message.includes("column")) {
      return { title: "Schema Mismatch", message: "Some requested columns were not found. The dashboard has been adjusted.", canRetry: false };
    }
  }
  return { title: "Unexpected Error", message: "Something went wrong. Please try again.", canRetry: true };
}
