/// <reference lib="webworker" />

import { executePlan } from "./query-engine";
import type { AnalyticsPlan, ColumnStatSummary, CSVRow, DatasetSchema, FilterPlan } from "@/types";

type WorkerRequest =
  | {
      id: string;
      type: "computeDataStats";
      payload: { rows: CSVRow[]; schema: DatasetSchema };
    }
  | {
      id: string;
      type: "executePlan";
      payload: {
        rows: CSVRow[];
        plan: AnalyticsPlan;
        extraFilters?: FilterPlan[];
        options?: { allColumns?: string[] };
      };
    };

type WorkerResponse = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

function computeDataStats(rows: CSVRow[], schema: DatasetSchema): ColumnStatSummary[] {
  return schema.columns.map((col) => {
    if (col.type === "number") {
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      let count = 0;
      for (const row of rows) {
        const v = Number(row[col.name]);
        if (!isNaN(v) && row[col.name] !== null && row[col.name] !== "") {
          sum += v;
          if (v < min) min = v;
          if (v > max) max = v;
          count++;
        }
      }
      return {
        name: col.name,
        type: col.type,
        sum: Math.round(sum * 100) / 100,
        min: count > 0 ? Math.round(min * 100) / 100 : 0,
        max: count > 0 ? Math.round(max * 100) / 100 : 0,
        mean: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
      };
    }

    if (col.type === "string") {
      const counts: Record<string, number> = {};
      for (const row of rows) {
        const v = row[col.name];
        if (v !== null && v !== "") {
          counts[String(v)] = (counts[String(v)] || 0) + 1;
        }
      }
      const total = rows.length;
      const topValues = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({
          value,
          pct: Math.round((count / total) * 1000) / 10,
        }));
      return { name: col.name, type: col.type, topValues };
    }

    if (col.type === "date") {
      const dates = rows
        .map((r) => r[col.name])
        .filter((v) => v !== null && v !== "")
        .map(String)
        .sort();
      return {
        name: col.name,
        type: col.type,
        dateRange: dates.length > 0 ? { min: dates[0], max: dates[dates.length - 1] } : undefined,
      };
    }

    return { name: col.name, type: col.type };
  });
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  const messageId = message.id;
  const respond = (payload: WorkerResponse) => {
    self.postMessage(payload);
  };

  try {
    if (message.type === "computeDataStats") {
      const { rows, schema } = message.payload;
      const result = computeDataStats(rows, schema);
      respond({ id: message.id, ok: true, result });
      return;
    }

    if (message.type === "executePlan") {
      const { rows, plan, extraFilters, options } = message.payload;
      const result = executePlan(rows, plan, extraFilters, options);
      respond({ id: message.id, ok: true, result });
      return;
    }

    respond({ id: messageId, ok: false, error: "Unknown worker task" });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Worker execution failed";
    respond({ id: messageId, ok: false, error: messageText });
  }
};
