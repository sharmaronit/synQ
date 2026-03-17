import type { DatasetSchema, AnalyticsPlan, ColumnStatSummary } from "@/types";

const fmtNum = (v: number | undefined): string => {
  if (v === undefined || v === null) return "N/A";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function buildStatsSection(dataStats: ColumnStatSummary[]): string {
  const lines = dataStats
    .map((s) => {
      if (s.type === "number") {
        return `  - "${s.name}": total=${fmtNum(s.sum)}, max=${fmtNum(s.max)}, min=${fmtNum(s.min)}, avg=${fmtNum(s.mean)}`;
      }
      if (s.type === "string" && s.topValues && s.topValues.length > 0) {
        const vals = s.topValues.map((v) => `${v.value}(${v.pct}%)`).join(", ");
        return `  - "${s.name}": top values → ${vals}`;
      }
      if (s.type === "date" && s.dateRange) {
        return `  - "${s.name}": range ${s.dateRange.min} → ${s.dateRange.max}`;
      }
      return null;
    })
    .filter(Boolean);

  return lines.length > 0
    ? `\nACTUAL COMPUTED STATS (these are real values — use them in your answer and insights):\n${lines.join("\n")}\n⚠️  IMPORTANT — "top values" above lists only the TOP 10 most frequent values. Many other values exist in the dataset that are simply less common. NEVER conclude a specific value is absent from the data just because it does not appear in this list.\n`
    : "";
}

export function buildGeminiPrompt(
  userQuery: string,
  schema: DatasetSchema,
  previousPlan?: AnalyticsPlan | null,
  isFollowUp: boolean = false,
  dataStats?: ColumnStatSummary[]
): string {
  const numericCols = schema.columns.filter((c) => c.type === "number").map((c) => `"${c.name}"`);
  const categoryCols = schema.columns.filter((c) => c.type === "string").map((c) => `"${c.name}"`);
  const dateCols = schema.columns.filter((c) => c.type === "date").map((c) => `"${c.name}"`);

  const schemaDescription = schema.columns
    .map((col) => {
      const samples = col.sampleValues.slice(0, 3).map((v) => JSON.stringify(v)).join(", ");
      return `  - "${col.name}" (${col.type}, ${col.uniqueCount} unique, samples: [${samples}])`;
    })
    .join("\n");

  const statsSection = dataStats ? buildStatsSection(dataStats) : "";

  const followUpContext =
    isFollowUp && previousPlan
      ? `
PREVIOUS ANALYSIS CONTEXT:
The user already has a dashboard with:
- Title: "${previousPlan.title}"
- Charts: ${previousPlan.charts.map((c) => `"${c.title}" (${c.chartType})`).join(", ")}
- KPIs: ${previousPlan.kpis.map((k) => k.label).join(", ")}

The user is asking a FOLLOW-UP question. Modify or extend the previous plan:
- "also show X" → ADD to existing charts/KPIs
- "change X to Y" → REPLACE the relevant chart/KPI
- "remove X" → EXCLUDE it
- "filter by X" → ADD filters to existing elements
`
      : "";

  return `You are synQ, a Conversational BI engine. Given a dataset schema and a user question, produce a structured analytics plan as JSON.

DATASET SCHEMA (${schema.rowCount} rows):
${schemaDescription}

COLUMN TYPES SUMMARY:
- Numeric columns (use as Y-axis): ${numericCols.join(", ") || "none"}
- Category columns (use as X-axis): ${categoryCols.join(", ") || "none"}
- Date columns (use as X-axis for trends): ${dateCols.join(", ") || "none"}
${statsSection}
${followUpContext}

USER QUESTION: "${userQuery}"

STRICT RULES:
1. ONLY use column names that EXACTLY match the schema. Never invent column names.
2. "answer" = a direct, natural-language answer to the user's question using ACTUAL COMPUTED STATS. Write it like a knowledgeable analyst, e.g. "There are 47 employees in Engineering" or "North region leads with $36,246 (28% of total)". Never say "appears to" or "seems to". Write plain prose sentences only — no markdown bullets, no asterisks, no underscores, no headers. BAD: "- Revenue: $36K  · Employees: 47". GOOD: "Electronics leads with $36,246 in revenue, accounting for 28% of total."
3. Generate charts ONLY if the user explicitly asks for a chart, graph, plot, or visualization. For factual questions ("how many", "what is", "who has the most", "show me X"), use an EMPTY charts array: "charts": []. When charts are required, use the right type:
   - Comparing categories: bar or horizontal-bar
   - Trend over time: line or area
   - Proportions: pie or donut
   - Correlation: scatter
4. For each chart: xColumn must be a category/date column, yColumn must be a numeric column.
5. Generate 2-3 KPIs from numeric columns (sum, avg, count, min, max). For filtered questions, KPIs run on the filtered dataset.
6. Use top-level "filters" to pre-filter data when the question targets a specific subset (e.g. "show first names of people with last name David" → filter Last_Name eq David). Filters apply before ALL KPIs and charts. ALWAYS include a count KPI (aggregation: "count") when filtering so the exact match count is computed.
7. Include a table with ALL available columns, sorted by the most relevant numeric column.
8. Insights MUST reference the ACTUAL COMPUTED STATS. Each insight must include a specific number.
   BAD: "Revenue varies significantly by category"
   GOOD: "Electronics generates 28% of total revenue ($36,246), more than double Clothing's 13%"
9. CRITICAL — For filter/lookup questions ("show me X where Y = Z", "find users with openness < 1", "list people with last name X"):
   - ALWAYS apply the filter via top-level "filters". Never skip it.
   - Your "answer" field must be a single natural sentence describing what was found. Do NOT list column names. Do NOT use a template. Write like: "There are 1,834 users in the dataset with an openness score below 1." or "The dataset contains 8 customers with last name Smith."
   - Do NOT say "there are no matching records" — the filter engine finds the actual rows regardless of what topValues shows. If a value is missing from topValues it is simply low-frequency, not absent.

RESPOND WITH ONLY valid JSON (no markdown, no code fences):

{
  "title": "Dashboard title",
  "description": "One sentence summary with a key number from stats",
  "answer": "Natural language answer using actual numbers — e.g. 'There are 47 employees in Engineering, earning an average of $92,000.'",
  "filters": [],
  "kpis": [
    { "label": "string", "column": "EXACT column name", "aggregation": "sum|avg|count|min|max|countDistinct", "format": "number|currency|percent", "prefix": "optional $", "suffix": "optional %" }
  ],
  "charts": [],
  "table": { "title": "string", "columns": ["ALL available column names"], "sortBy": "EXACT column name", "sortOrder": "desc" },
  "insights": [
    { "text": "Specific insight with actual numbers from the computed stats", "type": "observation|trend|anomaly|recommendation" }
  ]
}`;
}
