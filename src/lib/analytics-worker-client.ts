import type {
  AnalyticsPlan,
  ColumnStatSummary,
  CSVRow,
  DatasetSchema,
  FilterPlan,
  KPIResult,
  ChartResult,
} from "@/types";

type ExecutePlanResult = {
  kpis: KPIResult[];
  charts: ChartResult[];
  tableData: CSVRow[];
  tableColumns: string[];
  filteredRowCount: number;
};

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

const pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
let worker: Worker | null = null;

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./analytics-worker.ts", import.meta.url));
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, ok, result, error } = event.data;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);

    if (ok) {
      entry.resolve(result);
    } else {
      entry.reject(new Error(error ?? "Analytics worker failed"));
    }
  };

  worker.onerror = (event) => {
    const err = new Error(event.message || "Analytics worker runtime error");
    for (const [, entry] of pending) entry.reject(err);
    pending.clear();
  };

  return worker;
}

function postTask<T>(message: WorkerRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const w = getWorker();
    pending.set(message.id, { resolve: resolve as (value: unknown) => void, reject });
    w.postMessage(message);
  });
}

export async function computeDataStatsInWorker(rows: CSVRow[], schema: DatasetSchema): Promise<ColumnStatSummary[]> {
  const id = crypto.randomUUID();
  return postTask<ColumnStatSummary[]>({ id, type: "computeDataStats", payload: { rows, schema } });
}

export async function executePlanInWorker(
  rows: CSVRow[],
  plan: AnalyticsPlan,
  extraFilters?: FilterPlan[],
  options?: { allColumns?: string[] }
): Promise<ExecutePlanResult> {
  const id = crypto.randomUUID();
  return postTask<ExecutePlanResult>({
    id,
    type: "executePlan",
    payload: { rows, plan, extraFilters, options },
  });
}
