import Papa from "papaparse";
import type { CSVRow, ColumnSchema, DatasetSchema, Dataset } from "@/types";

export function parseCSV(csvText: string): CSVRow[] {
  const result = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    console.warn("CSV parse warnings:", result.errors);
    // Only hard-fail if NO rows were parsed at all
    const hasData = result.data.length > 0;
    if (!hasData) {
      throw new Error(`CSV parsing failed: ${result.errors[0].message}`);
    }
  }

  const validRows = result.data.filter((row) =>
    Object.values(row).some((v) => v !== null && v !== undefined && v !== "")
  );

  if (validRows.length === 0) {
    throw new Error("No valid data rows found in CSV");
  }

  return validRows;
}

export function inferSchema(rows: CSVRow[]): DatasetSchema {
  if (rows.length === 0) {
    return { columns: [], rowCount: 0, inferredAt: new Date().toISOString() };
  }

  const headers = Object.keys(rows[0]);
  const columns: ColumnSchema[] = headers.map((name) => {
    const values = rows.map((r) => r[name]);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
    const uniqueValues = new Set(nonNull.map(String));
    const type = inferColumnType(nonNull);

    return {
      name,
      type,
      sampleValues: nonNull.slice(0, 10),
      nullCount: values.length - nonNull.length,
      uniqueCount: uniqueValues.size,
    };
  });

  return { columns, rowCount: rows.length, inferredAt: new Date().toISOString() };
}

function inferColumnType(values: (string | number | null)[]): ColumnSchema["type"] {
  if (values.length === 0) return "string";
  const sample = values.slice(0, 500);

  const numericCount = sample.filter(
    (v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "")
  ).length;
  if (numericCount / sample.length > 0.8) return "number";

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{2}-\d{2}-\d{4}/,
    /^\w{3}\s+\d{1,2},?\s+\d{4}/,
    /^\d{4}\/\d{2}\/\d{2}/,
  ];
  const dateCount = sample.filter(
    (v) => typeof v === "string" && datePatterns.some((p) => p.test(v))
  ).length;
  if (dateCount / sample.length > 0.7) return "date";

  const boolValues = new Set(["true", "false", "yes", "no", "1", "0"]);
  const boolCount = sample.filter(
    (v) => typeof v === "string" && boolValues.has(v.toLowerCase())
  ).length;
  if (boolCount / sample.length > 0.9) return "boolean";

  return "string";
}

export function createDatasetFromFile(fileName: string, csvText: string): Dataset {
  const rows = parseCSV(csvText);
  const schema = inferSchema(rows);
  return { name: fileName, rows, schema, source: "upload" };
}
