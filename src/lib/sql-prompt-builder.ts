/**
 * sql-prompt-builder.ts
 * Builds the Gemini / GitHub Models prompt that requests:
 *   SQL query + chartType + xColumn + yColumn + insights
 * as JSON matching the SQLQueryPlan interface.
 */
import type { DatasetSchema, ColumnStatSummary } from "@/types";

const fmtNum = (v: number | undefined): string => {
  if (v === undefined || v === null) return "N/A";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function buildStatsSection(dataStats: ColumnStatSummary[]): string {
  const lines = dataStats
    .map((s) => {
      if (s.type === "number") {
        return `  - "${s.name}" [numeric]: total=${fmtNum(s.sum)}, max=${fmtNum(s.max)}, min=${fmtNum(s.min)}, avg=${fmtNum(s.mean)}`;
      }
      if (s.type === "string" && s.topValues && s.topValues.length > 0) {
        const vals = s.topValues.slice(0, 5).map((v) => `"${v.value}"(${v.pct}%)`).join(", ");
        return `  - "${s.name}" [string]: top values → ${vals}`;
      }
      if (s.type === "date" && s.dateRange) {
        return `  - "${s.name}" [date]: range ${s.dateRange.min} → ${s.dateRange.max}`;
      }
      return null;
    })
    .filter(Boolean);

  if (lines.length === 0) return "";
  return (
    `\nACTUAL DATA STATS (use these real numbers in description and insights — do NOT invent values):\n` +
    `${lines.join("\n")}\n` +
    `⚠️ "top values" shows only the most frequent values. Many other values exist in the data.\n`
  );
}

export function buildSQLPrompt(
  userQuery: string,
  schema: DatasetSchema,
  dataStats?: ColumnStatSummary[]
): string {
  // Schema description — wrap column names with spaces in backticks to model them correctly
  const schemaLines = schema.columns
    .map((col) => {
      const samples = col.sampleValues.slice(0, 3).map((v) => JSON.stringify(v)).join(", ");
      const display = col.name.includes(" ") ? `\`${col.name}\`` : col.name;
      return `  - ${display} (${col.type}, ${col.uniqueCount} unique, samples: [${samples}])`;
    })
    .join("\n");

  const statsSection = dataStats ? buildStatsSection(dataStats) : "";

  // Explicitly list columns that need backtick quoting so the model cannot miss them
  const spacedCols = schema.columns.filter((c) => c.name.includes(" "));
  const backtickWarning =
    spacedCols.length > 0
      ? `\nCOLUMNS REQUIRING BACKTICK QUOTING (have spaces in name):\n` +
        spacedCols.map((c) => `  \`${c.name}\``).join("\n") + "\n"
      : "";

  return `You are synQ, a SQL-based analytics engine. Convert the user question to SQL and return a JSON response.

DATASET: single table named "data", ${schema.rowCount} rows total.

COLUMNS:
${schemaLines}
${statsSection}${backtickWarning}
━━━ SQL RULES ━━━

1. Table is always "data". Never reference any other table name.
2. NEVER use JOIN — this is a single-table engine.
3. Column names with spaces MUST be wrapped in backticks:
     ✓  SELECT \`First Name\`, \`Last Name\` FROM data
     ✗  SELECT "First Name", First Name FROM data
4. Give every aggregate an alias:
     ✓  SELECT COUNT(*) as total, AVG(openness) as avg_openness
     ✗  SELECT COUNT(*), AVG(openness)
5. No subqueries or CTEs — flat single-level SELECT only.
6. String comparisons use single quotes: WHERE status = 'Active'
7. LIMIT row queries to 500 maximum.

━━━ QUERY PATTERN GUIDE ━━━

Intent                     | SQL Pattern
---------------------------|---------------------------------------------------------------
how many / count           | SELECT COUNT(*) as total FROM data WHERE ...
show / list / find / get   | SELECT * FROM data WHERE ... ORDER BY ... LIMIT 500
average of                 | SELECT AVG(\`col\`) as avg_col FROM data WHERE ...
sum / total of             | SELECT SUM(\`col\`) as total_col FROM data WHERE ...
max / highest              | SELECT MAX(\`col\`) as max_col FROM data
min / lowest               | SELECT MIN(\`col\`) as min_col FROM data
which X has most Y         | SELECT \`X\`, SUM(\`Y\`) as total_y FROM data GROUP BY \`X\` ORDER BY total_y DESC LIMIT 20
distribution / breakdown   | SELECT \`X\`, COUNT(*) as count FROM data GROUP BY \`X\` ORDER BY count DESC LIMIT 30
trend over time            | SELECT \`date_col\`, SUM(\`val\`) as total FROM data GROUP BY \`date_col\` ORDER BY \`date_col\`

━━━ CHART TYPE GUIDE ━━━

none           → scalar result (COUNT/AVG/SUM) or full row SELECT
bar            → string X axis, up to ~15 categories
horizontal-bar → string X axis, more than 15 categories
line           → date X axis (time series)
area           → date X axis, cumulative/volume trend
pie            → proportion, 3–8 categories
donut          → proportion, 3–8 categories (preferred over pie)
scatter        → two numeric columns for correlation

xColumn and yColumn must be EXACT column names as they appear in your SQL result
(use the alias you assigned, e.g. "total_revenue" not "SUM(\`Revenue\`)").
Set chartType to "none" and omit xColumn/yColumn for scalar queries.

━━━ USER QUESTION ━━━
"${userQuery}"

━━━ RESPONSE FORMAT ━━━
Respond with ONLY valid JSON — no markdown, no code fences:

{
  "sql": "SELECT ... FROM data ...",
  "title": "Concise dashboard title (max 60 chars)",
  "description": "One complete sentence summarising the key result with a real number from the stats above",
  "chartType": "bar|horizontal-bar|line|area|pie|donut|scatter|none",
  "xColumn": "exact column name from SQL result for X axis",
  "yColumn": "exact column name from SQL result for Y axis",
  "insights": [
    { "text": "Specific insight with a real number from the data statistics", "type": "observation|trend|anomaly|recommendation" },
    { "text": "Second insight with a real number", "type": "observation|trend|anomaly|recommendation" }
  ]
}`;
}
