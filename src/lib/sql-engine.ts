/**
 * sql-engine.ts
 * Custom JS query executor — handles exactly the SQL patterns from sql-prompt-builder.ts.
 * No external dependencies. No AlaSQL. Works in browser and server.
 */
import type { CSVRow, KPIResult, ChartResult, ChartDataPoint, SQLQueryPlan } from "@/types";

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface SQLResult {
  rows: CSVRow[];
  columns: string[];
  rowCount: number;
  totalBeforeLimit?: number;   // rows matching WHERE before LIMIT was applied
  isScalar: boolean;           // true: 1 row + all values are numbers (COUNT/SUM/AVG)
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const fmt = (v: number): string =>
  v.toLocaleString(undefined, { maximumFractionDigits: 2 });

function inferQueryIntent(query: string): "highest" | "lowest" | "generic" {
  const normalized = query.toLowerCase();
  if (/\b(lowest|least|minimum|min)\b/.test(normalized)) return "lowest";
  if (/\b(highest|most|maximum|max)\b/.test(normalized)) return "highest";
  return "generic";
}

function toLabel(colName: string): string {
  return colName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Strip surrounding quote chars from an SQL identifier: `col`, [col], "col" → col
const unquote = (s: string): string =>
  s.trim().replace(/^[`"[]|[`"\]]$/g, "").trim();

// Regex fragment for a quoted or bare identifier (used to build ORDER BY / GROUP BY regexes)
const IDENT = "(`[^`]+`|\\[[^\\]]+\\]|[\\w]+(?:\\s[\\w]+)*)";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type AggFn = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

interface SelectCol {
  alias: string;
  selectAll?: boolean;
  column?: string;        // unquoted raw column name
  agg?: AggFn;
  aggColumn?: string;     // unquoted column for aggregate (undefined for COUNT(*))
}

interface Condition {
  column: string;
  op: "=" | "!=" | "<" | ">" | "<=" | ">=";
  value: string | number;
  likeRegex?: RegExp;
}

interface ParsedSQL {
  selectAll: boolean;
  selectCols: SelectCol[];
  hasAggregates: boolean;
  conditions: Condition[];
  groupBy?: string;
  orderBy?: string;
  orderDesc: boolean;
  limit?: number;
}

// ---------------------------------------------------------------------------
// SELECT clause parser
// ---------------------------------------------------------------------------

/** Split by top-level commas (ignores commas inside parentheses). */
function splitSelectParts(clause: string): string[] {
  const parts: string[] = [];
  let depth = 0, current = "";
  for (const ch of clause) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSelect(clause: string): SelectCol[] {
  if (clause.trim() === "*") return [{ selectAll: true, alias: "*" }];

  return splitSelectParts(clause).map((part): SelectCol => {
    const p = part.trim();
    // Extract optional AS alias
    const asM = p.match(/^(.+?)\s+AS\s+(\w+)\s*$/i);
    const expr  = asM ? asM[1].trim() : p;
    const alias = asM ? asM[2] : "";

    // Aggregate function: COUNT(*), SUM(`col`), AVG(col), MIN/MAX(col)
    const aggM = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.*?)\s*\)\s*$/i);
    if (aggM) {
      const agg        = aggM[1].toUpperCase() as AggFn;
      const argRaw     = aggM[2].trim();
      const aggColumn  = argRaw === "*" || argRaw === "" ? undefined : unquote(argRaw);
      const fallback   = agg.toLowerCase() + (aggColumn ? `_${aggColumn.replace(/\s/g, "_")}` : "");
      return { agg, aggColumn, alias: alias || fallback };
    }

    // Regular column
    const column = unquote(expr);
    return { column, alias: alias || column };
  });
}

// ---------------------------------------------------------------------------
// WHERE clause parser
// ---------------------------------------------------------------------------

function parseCondition(part: string): Condition | null {
  const p = part.trim();
  // Try backtick / bracket quoted identifier first, then bare word
  const m =
    p.match(/^(`[^`]+`|\[[^\]]+\])\s*(!=|<>|<=|>=|LIKE|=|<|>)\s*(.+)$/i) ??
    p.match(/^(\w+)\s*(!=|<>|<=|>=|LIKE|=|<|>)\s*(.+)$/i);
  if (!m) return null;

  const column  = unquote(m[1]);
  const opRaw   = m[2].toUpperCase();
  const rawVal  = m[3].trim();

  let value: string | number;
  if ((rawVal.startsWith("'") && rawVal.endsWith("'")) ||
      (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
    value = rawVal.slice(1, -1);
  } else if (rawVal !== "" && !isNaN(Number(rawVal))) {
    value = Number(rawVal);
  } else {
    value = rawVal;
  }

  if (opRaw === "LIKE") {
    const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped.replace(/%/g, ".*").replace(/_/g, ".");
    return { column, op: "=", value, likeRegex: new RegExp(`^${pattern}$`, "i") };
  }

  return { column, op: (opRaw === "<>" ? "!=" : opRaw) as Condition["op"], value };
}

function parseWhere(clause: string): Condition[] {
  return clause
    .split(/\bAND\b/i)
    .map((p) => parseCondition(p.trim()))
    .filter((c): c is Condition => c !== null);
}

// ---------------------------------------------------------------------------
// Top-level SQL parser  (strips clauses from the end to avoid ambiguity)
// ---------------------------------------------------------------------------

function parseSQL(sql: string): ParsedSQL {
  // Normalise whitespace
  let s = sql.replace(/\s+/g, " ").trim();

  // ── LIMIT ────────────────────────────────────────────────────────────────
  let limit: number | undefined;
  const limitM = s.match(/\bLIMIT\s+(\d+)\s*$/i);
  if (limitM) { limit = parseInt(limitM[1]); s = s.slice(0, -limitM[0].length).trim(); }

  // ── ORDER BY  (identifier + optional ASC/DESC) ───────────────────────────
  let orderBy: string | undefined, orderDesc = false;
  const orderM = s.match(new RegExp(`\\bORDER\\s+BY\\s+(${IDENT})(?:\\s+(ASC|DESC))?\\s*$`, "i"));
  if (orderM) {
    orderBy   = unquote(orderM[1]);
    orderDesc = (orderM[2] ?? "").toUpperCase() === "DESC";
    s = s.slice(0, -orderM[0].length).trim();
  }

  // ── GROUP BY ─────────────────────────────────────────────────────────────
  let groupBy: string | undefined;
  const groupM = s.match(new RegExp(`\\bGROUP\\s+BY\\s+(${IDENT})\\s*$`, "i"));
  if (groupM) {
    groupBy = unquote(groupM[1]);
    s = s.slice(0, -groupM[0].length).trim();
  }

  // ── WHERE ─────────────────────────────────────────────────────────────────
  let conditions: Condition[] = [];
  const whereM = s.match(/\bWHERE\s+(.+?)\s*$/i);
  if (whereM) {
    conditions = parseWhere(whereM[1]);
    s = s.slice(0, -whereM[0].length).trim();
  }

  // ── SELECT … FROM ─────────────────────────────────────────────────────────
  const selectM = s.match(/^SELECT\s+(.+?)\s+FROM\b/i);
  const selectCols    = parseSelect(selectM ? selectM[1] : "*");
  const hasAggregates = selectCols.some((c) => c.agg !== undefined);
  const selectAll     = selectCols.some((c) => c.selectAll);

  return { selectAll, selectCols, hasAggregates, conditions, groupBy, orderBy, orderDesc, limit };
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

function evalCond(row: CSVRow, cond: Condition): boolean {
  const val = row[cond.column];
  if (val === null || val === undefined) return false;
  if (cond.likeRegex) return cond.likeRegex.test(String(val));

  // Use numeric comparison when the column value is a number; string otherwise
  const numericMode = typeof val === "number";
  const a = numericMode ? Number(val)               : String(val).toLowerCase().trim();
  const b = numericMode ? Number(cond.value)         : String(cond.value).toLowerCase().trim();

  switch (cond.op) {
    case "=":  return a === b;
    case "!=": return a !== b;
    case "<":  return (a as number) <  (b as number);
    case ">":  return (a as number) >  (b as number);
    case "<=": return (a as number) <= (b as number);
    case ">=": return (a as number) >= (b as number);
    default:   return false;
  }
}

// ---------------------------------------------------------------------------
// Aggregate computation
// ---------------------------------------------------------------------------

function computeAgg(rows: CSVRow[], col: SelectCol): number {
  if (col.agg === "COUNT") return rows.length;
  const vals = rows.map((r) => Number(r[col.aggColumn!])).filter((v) => !isNaN(v));
  if (vals.length === 0) return 0;
  switch (col.agg) {
    case "SUM": return vals.reduce((a, b) => a + b, 0);
    case "AVG": return vals.reduce((a, b) => a + b, 0) / vals.length;
    case "MIN": return Math.min(...vals);
    case "MAX": return Math.max(...vals);
    default:    return 0;
  }
}

// ---------------------------------------------------------------------------
// Query execution
// ---------------------------------------------------------------------------

function runQuery(parsed: ParsedSQL, data: CSVRow[]): {
  rows: CSVRow[];
  columns: string[];
  totalBeforeLimit: number;
} {
  // 1. Filter
  const filtered = parsed.conditions.length > 0
    ? data.filter((row) => parsed.conditions.every((c) => evalCond(row, c)))
    : data;

  // 2. Aggregate / group / project
  let rows: CSVRow[];
  let columns: string[];

  if (parsed.groupBy) {
    // ── GROUP BY path ────────────────────────────────────────────────────
    const groupCol = parsed.groupBy;
    const groups   = new Map<string, CSVRow[]>();
    for (const row of filtered) {
      const key = String(row[groupCol] ?? "");
      const bucket = groups.get(key);
      if (bucket) bucket.push(row); else groups.set(key, [row]);
    }

    rows = [];
    for (const [, groupRows] of groups) {
      const outRow: CSVRow = {};
      for (const col of parsed.selectCols) {
        if (col.selectAll) continue;
        if (col.agg) {
          outRow[col.alias] = computeAgg(groupRows, col);
        } else if (col.column) {
          // Non-aggregate column: take value from first row in group
          outRow[col.alias] = groupRows[0][col.column] ?? null;
        }
      }
      rows.push(outRow);
    }
    columns = rows.length > 0
      ? Object.keys(rows[0])
      : parsed.selectCols.filter((c) => !c.selectAll).map((c) => c.alias);

  } else if (parsed.hasAggregates) {
    // ── Scalar aggregates (no GROUP BY) ─────────────────────────────────
    const outRow: CSVRow = {};
    for (const col of parsed.selectCols) {
      if (col.agg) outRow[col.alias] = computeAgg(filtered, col);
    }
    rows    = [outRow];
    columns = Object.keys(outRow);

  } else if (parsed.selectAll) {
    // ── SELECT * ─────────────────────────────────────────────────────────
    rows    = filtered;
    columns = data.length > 0 ? Object.keys(data[0]) : [];

  } else {
    // ── Column projection ────────────────────────────────────────────────
    rows = filtered.map((row) => {
      const out: CSVRow = {};
      for (const col of parsed.selectCols) {
        if (col.column) out[col.alias] = row[col.column] ?? null;
      }
      return out;
    });
    columns = parsed.selectCols.filter((c) => c.column).map((c) => c.alias);
  }

  // 3. ORDER BY
  if (parsed.orderBy) {
    const ob   = parsed.orderBy;
    const desc = parsed.orderDesc;
    rows = [...rows].sort((a, b) => {
      const av = a[ob], bv = b[ob];
      if (typeof av === "number" && typeof bv === "number") return desc ? bv - av : av - bv;
      return desc
        ? String(bv ?? "").localeCompare(String(av ?? ""))
        : String(av ?? "").localeCompare(String(bv ?? ""));
    });
  }

  const totalBeforeLimit = rows.length;

  // 4. LIMIT
  if (parsed.limit !== undefined) rows = rows.slice(0, parsed.limit);

  return { rows, columns, totalBeforeLimit };
}

// ---------------------------------------------------------------------------
// Public: executeSQL
// ---------------------------------------------------------------------------

export async function executeSQL(sql: string, data: CSVRow[]): Promise<SQLResult> {
  try {
    const parsed  = parseSQL(sql);
    const { rows, columns, totalBeforeLimit } = runQuery(parsed, data);

    const rowCount  = rows.length;
    const firstRow  = rows[0] ?? {};
    const isScalar  =
      rowCount === 1 &&
      columns.length > 0 &&
      columns.every((c) => { const v = firstRow[c]; return v === null || v === undefined || typeof v === "number"; });

    return { rows, columns, rowCount, totalBeforeLimit, isScalar };
  } catch (e) {
    return { rows: [], columns: [], rowCount: 0, isScalar: false,
             error: e instanceof Error ? e.message : "SQL execution error" };
  }
}

// ---------------------------------------------------------------------------
// KPI derivation
// ---------------------------------------------------------------------------

export function deriveKPIsFromSQL(result: SQLResult): KPIResult[] {
  if (result.error || result.rowCount === 0) {
    return [{ label: "Matching Rows", value: "0", rawValue: 0 }];
  }

  // Scalar aggregate result (COUNT/SUM/AVG…)
  if (result.isScalar) {
    const row  = result.rows[0];
    const kpis = result.columns
      .filter((c) => {
        const v = row[c];
        return v !== null && v !== undefined && v !== "" &&
               (typeof v === "number" || !isNaN(Number(v)));
      })
      .map((c) => {
        const raw = Number(row[c]);
        return { label: toLabel(c), value: fmt(raw), rawValue: raw };
      });
    if (kpis.length > 0) return kpis;
  }

  // Multi-row result — use totalBeforeLimit so LIMIT 500 doesn't hide the real count
  const count = result.totalBeforeLimit ?? result.rowCount;
  if (count > 1) return [{ label: "Matching Rows", value: count.toLocaleString(), rawValue: count }];

  // Single non-scalar row (pure string lookup)
  if (result.rowCount === 1) {
    const row  = result.rows[0];
    const kpis = result.columns
      .filter((c) => {
        const v = row[c];
        return v !== null && v !== undefined && v !== "" &&
               (typeof v === "number" || !isNaN(Number(v)));
      })
      .map((c) => ({ label: toLabel(c), value: fmt(Number(row[c])), rawValue: Number(row[c]) }));
    if (kpis.length > 0) return kpis;
    return [{ label: "Matching Rows", value: "1", rawValue: 1 }];
  }

  return [{ label: "Matching Rows", value: "0", rawValue: 0 }];
}

// ---------------------------------------------------------------------------
// Chart derivation
// ---------------------------------------------------------------------------

export function deriveChartsFromSQL(result: SQLResult, sqlPlan: SQLQueryPlan): ChartResult[] {
  if (result.error || result.rowCount === 0) return [];
  if (sqlPlan.chartType === "none") return [];
  if (!sqlPlan.xColumn || !sqlPlan.yColumn) return [];
  if (!result.columns.includes(sqlPlan.xColumn) || !result.columns.includes(sqlPlan.yColumn)) return [];

  const { xColumn, yColumn, chartType, title } = sqlPlan;
  const chartData: ChartDataPoint[] = result.rows.map((row) => ({
    label: String(row[xColumn] ?? ""),
    value: Number(row[yColumn] ?? 0),
  }));

  return [{
    title,
    chartType: chartType as ChartResult["chartType"],
    data: chartData,
    xKey:  "label",
    yKey:  "value",
  }];
}

// ---------------------------------------------------------------------------
// Answer construction — reads ONLY from result.rows, never from AI text
// ---------------------------------------------------------------------------

export function buildAnswerFromSQL(
  result: SQLResult,
  query: string,
  sqlPlan: SQLQueryPlan
): string {
  if (result.error) return "Query failed — showing full dataset.";
  if (result.rowCount === 0) return "No rows matched your query.";

  const parts: string[] = [];
  const intent = inferQueryIntent(query);

  if (result.isScalar) {
    const row = result.rows[0];
    const desc = result.columns
      .filter((c) => {
        const v = row[c];
        return v !== null && v !== undefined && v !== "" &&
               (typeof v === "number" || !isNaN(Number(v)));
      })
      .map((c) => `**${toLabel(c)}:** ${fmt(Number(row[c]))}`);
    parts.push(desc.length > 0 ? desc.join("  ·  ") : "Found **1 matching row**. See the table for details.");
  } else {
    // Use totalBeforeLimit so "SELECT * LIMIT 500" shows the real count, not 500
    const displayCount = result.totalBeforeLimit ?? result.rowCount;

    if (
      sqlPlan.xColumn && sqlPlan.yColumn &&
      result.columns.includes(sqlPlan.xColumn) &&
      result.columns.includes(sqlPlan.yColumn)
    ) {
      const top  = result.rows[0];
      const topLabel = String(top[sqlPlan.xColumn] ?? "");
      const topValue = Number(top[sqlPlan.yColumn] ?? 0);
      if (topLabel && !isNaN(topValue)) {
        const metricLabel = toLabel(sqlPlan.yColumn);
        if (intent === "lowest") {
          parts.push(`**${topLabel}** has the lowest **${metricLabel}** at **${fmt(topValue)}**.`);
        } else if (intent === "highest") {
          parts.push(`**${topLabel}** has the highest **${metricLabel}** at **${fmt(topValue)}**.`);
        } else {
          parts.push(`Found **${displayCount.toLocaleString()} rows** matching your query.`);
          parts.push(`**${topLabel}** leads with **${fmt(topValue)}**.`);
        }
      } else {
        parts.push(`Found **${displayCount.toLocaleString()} rows** matching your query.`);
      }
    } else {
      parts.push(`Found **${displayCount.toLocaleString()} rows** matching your query.`);
    }
  }

  return parts.join("\n\n") || sqlPlan.description || "Dashboard generated from your data.";
}
