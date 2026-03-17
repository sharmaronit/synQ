import type { CSVRow, ColumnSchema, ColumnStats } from "@/types";

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

export function computeColumnStats(rows: CSVRow[], col: ColumnSchema): ColumnStats {
  const values = rows.map((r) => r[col.name]);
  const nullCount = values.filter((v) => v === null || v === undefined || v === "").length;

  if (col.type === "number") {
    const nums = values.map(toNum).filter((n): n is number => n !== null);
    const count = nums.length;

    if (count === 0) {
      return { name: col.name, type: col.type, count: rows.length, nullCount, uniqueCount: col.uniqueCount };
    }

    const sorted = [...nums].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = nums.reduce((a, b) => a + b, 0) / count;
    const median =
      count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / count;
    const stdDev = Math.sqrt(variance);

    // 10-bin histogram
    const binSize = (max - min) / 10 || 1;
    const bins = Array.from({ length: 10 }, (_, i) => ({
      bin: `${(min + i * binSize).toFixed(1)}–${(min + (i + 1) * binSize).toFixed(1)}`,
      count: 0,
    }));
    nums.forEach((n) => {
      const idx = Math.min(Math.floor((n - min) / binSize), 9);
      bins[idx].count++;
    });

    return { name: col.name, type: col.type, count: rows.length, nullCount, uniqueCount: col.uniqueCount, min, max, mean, median, stdDev, histogram: bins };
  } else {
    // String/date columns — top values
    const freq = new Map<string, number>();
    values.forEach((v) => {
      if (v !== null && v !== undefined && v !== "") {
        const key = String(v);
        freq.set(key, (freq.get(key) ?? 0) + 1);
      }
    });
    const topValues = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    return { name: col.name, type: col.type, count: rows.length, nullCount, uniqueCount: col.uniqueCount, topValues };
  }
}

export function computeCorrelationMatrix(
  rows: CSVRow[],
  colNames: string[]
): { cols: string[]; matrix: number[][] } {
  const data: number[][] = colNames.map((col) =>
    rows.map((r) => toNum(r[col]) ?? 0)
  );

  const n = rows.length;
  const means = data.map((col) => col.reduce((a, b) => a + b, 0) / n);

  function pearson(xi: number[], yi: number[], mx: number, my: number): number {
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = xi[i] - mx;
      const dy = yi[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    const denom = Math.sqrt(dx2 * dy2);
    return denom === 0 ? 0 : num / denom;
  }

  const matrix = colNames.map((_, i) =>
    colNames.map((_, j) => {
      if (i === j) return 1;
      return Math.round(pearson(data[i], data[j], means[i], means[j]) * 100) / 100;
    })
  );

  return { cols: colNames, matrix };
}

export function detectOutlierRows(rows: CSVRow[], numericCols: string[]): Set<number> {
  const outliers = new Set<number>();
  if (numericCols.length === 0) return outliers;

  numericCols.forEach((col) => {
    const nums = rows.map((r) => toNum(r[col]));
    const valid = nums.filter((n): n is number => n !== null);
    if (valid.length < 4) return;

    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const std = Math.sqrt(valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length);
    if (std === 0) return;

    nums.forEach((n, i) => {
      if (n !== null && Math.abs((n - mean) / std) > 2.5) {
        outliers.add(i);
      }
    });
  });

  return outliers;
}
