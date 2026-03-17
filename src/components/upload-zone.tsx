"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";
import pako from "pako";
import { createDatasetFromFile } from "@/lib/csv-parser";
import type { Dataset } from "@/types";

interface UploadZoneProps {
  onDataLoaded: (dataset: Dataset) => void;
}

export function UploadZone({ onDataLoaded }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const isCsv = file.name.endsWith(".csv");
    const isGz = file.name.endsWith(".gz");

    if (!isCsv && !isGz) {
      setError("Please upload a .csv or .csv.gz file");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File must be under 100MB");
      return;
    }
    fileRef.current = file;
    setFileName(file.name);
  }, []);

  const analyze = useCallback(() => {
    const file = fileRef.current;
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    if (file.name.endsWith(".gz")) {
      // Handle gzip decompression
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) throw new Error("Failed to read file");

          // Decompress using pako
          const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
          const text = new TextDecoder().decode(decompressed);

          if (!text || text.trim().length === 0) {
            setError("Decompressed file is empty");
            setIsProcessing(false);
            return;
          }

          // Extract original filename (remove .gz)
          const originalName = file.name.replace(/\.gz$/, "");
          const dataset = createDatasetFromFile(originalName, text);

          if (dataset.rows.length === 0) {
            setError("No valid data rows found. Please check your CSV format.");
            setIsProcessing(false);
            return;
          }
          if (dataset.schema.columns.length === 0) {
            setError("No columns detected. Please check your CSV headers.");
            setIsProcessing(false);
            return;
          }
          onDataLoaded(dataset);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Failed to decompress file";
          let friendlyMsg = errorMsg;
          if (errorMsg.includes("incorrect data check")) {
            friendlyMsg = "Invalid .gz file: Data appears corrupted or not gzip-compressed";
          } else if (errorMsg.includes("parsing failed")) {
            friendlyMsg = "CSV format error in decompressed data: " + errorMsg.split(":")[1]?.trim() || "Invalid CSV structure";
          }
          setError(friendlyMsg);
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file. Check file permissions.");
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle regular CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text || text.trim().length === 0) {
            setError("CSV file is empty");
            setIsProcessing(false);
            return;
          }
          const dataset = createDatasetFromFile(file.name, text);
          if (dataset.rows.length === 0) {
            setError("No valid data rows found. Please check your CSV format.");
            setIsProcessing(false);
            return;
          }
          if (dataset.schema.columns.length === 0) {
            setError("No columns detected. Please check your CSV headers.");
            setIsProcessing(false);
            return;
          }
          onDataLoaded(dataset);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Failed to parse CSV";
          let friendlyMsg = errorMsg;
          if (errorMsg.includes("Too many fields") || errorMsg.includes("Too few fields")) {
            friendlyMsg = "CSV format issue: Some rows have mismatched columns. Check for unquoted commas in data.";
          } else if (errorMsg.includes("parsing failed")) {
            friendlyMsg = "CSV format error: " + errorMsg.split(":")[1]?.trim() || "Invalid CSV structure";
          }
          setError(friendlyMsg);
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file. Check file permissions.");
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }
  }, [onDataLoaded]);

  const clear = () => {
    fileRef.current = null;
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="rounded-2xl p-6 border"
      style={{
        background: "linear-gradient(135deg, rgba(250, 246, 240, 0.62) 0%, rgba(232, 223, 210, 0.5) 100%)",
        backdropFilter: "blur(18px) saturate(155%)",
        WebkitBackdropFilter: "blur(18px) saturate(155%)",
        boxShadow: "0 14px 36px rgba(30, 28, 26, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        borderColor: "rgba(255, 255, 255, 0.45)",
      }}
    >
      <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-sage)" }}>
        Upload Dataset
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        Drag and drop or click to select your CSV or CSV.GZ file
      </p>

      <div
        className="rounded-xl p-8 text-center cursor-pointer transition-all duration-300 mb-4"
        style={{
          border: `2px dashed ${isDragOver ? "var(--color-sage-hover)" : "rgba(30, 28, 26, 0.45)"}`,
          background: isDragOver ? "rgba(250, 246, 240, 0.58)" : "rgba(250, 246, 240, 0.35)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transform: isDragOver ? "translateY(-2px)" : "none",
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-sage)" }} />
        <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>Click or drag file here</p>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>CSV or CSV.GZ files &mdash; Max 100MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.gz"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {fileName && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ background: "var(--color-sage-muted)" }}>
          <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--color-sage)" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "var(--color-sage)" }}>{fileName}</span>
          <button onClick={clear} className="p-1 rounded hover:bg-white/50 cursor-pointer">
            <X className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: "rgba(214,48,49,0.1)", color: "var(--color-danger)", border: "1px solid rgba(214,48,49,0.3)" }}>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={analyze}
          disabled={!fileName || isProcessing}
          className="flex-1 py-3 px-5 rounded-[10px] text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: "var(--color-sage)",
            boxShadow: "var(--shadow-btn)",
          }}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" /> Processing...
            </span>
          ) : (
            "Analyze Dataset"
          )}
        </button>
      </div>
    </div>
  );
}
