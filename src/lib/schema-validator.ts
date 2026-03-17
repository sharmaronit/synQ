import type { AnalyticsPlan, DatasetSchema, ColumnSchema } from "@/types";

// Normalize: lowercase, strip all non-alphanumeric chars
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function findBestColumnMatch(name: string, schema: DatasetSchema): string | null {
  // 1. Exact match
  if (schema.columns.some((c) => c.name === name)) return name;
  // 2. Case-insensitive
  const ci = schema.columns.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (ci) return ci.name;
  // 3. Normalized (strips spaces, underscores, hyphens, etc.)
  const norm = normalize(name);
  const nc = schema.columns.find((c) => normalize(c.name) === norm);
  if (nc) return nc.name;
  // 4. Partial / contains match — requires min 4-char length AND ≥60% overlap ratio
  //    to prevent "date" silently matching "update_date" or "created_date"
  const partial = norm.length >= 4
    ? schema.columns.find((c) => {
        const cn = normalize(c.name);
        if (cn.length < 4) return false;
        const longer = cn.length > norm.length ? cn : norm;
        const shorter = cn.length > norm.length ? norm : cn;
        return longer.includes(shorter) && shorter.length / longer.length >= 0.6;
      })
    : null;
  if (partial) return partial.name;
  return null;
}

export function validatePlanAgainstSchema(
  plan: AnalyticsPlan,
  schema: DatasetSchema
): string[] {
  const errors: string[] = [];
  const validColumns = new Set(schema.columns.map((c) => c.name));

  function checkColumn(columnName: string, context: string): boolean {
    if (validColumns.has(columnName)) return true;
    const best = findBestColumnMatch(columnName, schema);
    if (best) {
      errors.push(`${context}: "${columnName}" auto-corrected to "${best}"`);
      return true;
    }
    errors.push(`${context}: Column "${columnName}" does not exist. Valid: [${[...validColumns].join(", ")}]`);
    return false;
  }

  plan.kpis.forEach((kpi, i) => checkColumn(kpi.column, `KPI[${i}] "${kpi.label}"`));
  plan.charts.forEach((chart, i) => {
    const ctx = `Chart[${i}] "${chart.title}"`;
    checkColumn(chart.xColumn, ctx);
    checkColumn(chart.yColumn, ctx);
    if (chart.groupBy) checkColumn(chart.groupBy, `${ctx}.groupBy`);
  });
  if (plan.table) {
    plan.table.columns.forEach((col, i) => checkColumn(col, `Table.columns[${i}]`));
    if (plan.table.sortBy) checkColumn(plan.table.sortBy, "Table.sortBy");
  }

  return errors;
}

export function fixColumnCasing(plan: AnalyticsPlan, schema: DatasetSchema): AnalyticsPlan {
  const fix = (name: string): string => findBestColumnMatch(name, schema) ?? name;

  return {
    ...plan,
    filters: plan.filters?.map((f) => ({ ...f, column: fix(f.column) })),
    kpis: plan.kpis.map((k) => ({ ...k, column: fix(k.column) })),
    charts: plan.charts.map((c) => ({
      ...c,
      xColumn: fix(c.xColumn),
      yColumn: fix(c.yColumn),
      groupBy: c.groupBy ? fix(c.groupBy) : undefined,
    })),
    table: plan.table
      ? {
          ...plan.table,
          columns: plan.table.columns.map(fix),
          sortBy: plan.table.sortBy ? fix(plan.table.sortBy) : undefined,
        }
      : undefined,
    insights: plan.insights,
  };
}

export function autoCorrectPlan(plan: AnalyticsPlan, schema: DatasetSchema): AnalyticsPlan {
  const validColumns = new Set(schema.columns.map((c) => c.name));
  const fixed = fixColumnCasing(plan, schema);

  fixed.kpis = fixed.kpis.filter((k) => validColumns.has(k.column));
  fixed.charts = fixed.charts.filter(
    (c) => validColumns.has(c.xColumn) && validColumns.has(c.yColumn)
  );
  if (fixed.table) {
    fixed.table.columns = fixed.table.columns.filter((c) => validColumns.has(c));
    // If all columns were stripped, fall back to first 5 schema columns
    if (fixed.table.columns.length === 0) {
      fixed.table.columns = schema.columns.slice(0, 5).map((c) => c.name);
    }
  }

  return fixed;
}

