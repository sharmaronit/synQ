"use client";

import { DEMO_DATASETS, loadDemoDataset } from "@/lib/sample-data";
import type { Dataset } from "@/types";
import { ShoppingCart, Users, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DemoSelectorProps {
  onDataLoaded: (dataset: Dataset) => void;
}

const ICONS: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart className="w-6 h-6" />,
  Users: <Users className="w-6 h-6" />,
  GraduationCap: <GraduationCap className="w-6 h-6" />,
};

export function DemoSelector({ onDataLoaded }: DemoSelectorProps) {
  const handleSelect = (id: string) => {
    const dataset = loadDemoDataset(id);
    onDataLoaded(dataset);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {DEMO_DATASETS.map((demo) => (
        <button
          key={demo.id}
          onClick={() => handleSelect(demo.id)}
          className="border rounded-2xl p-5 text-left card-hover cursor-pointer"
          style={{
            background: "linear-gradient(135deg, rgba(250, 246, 240, 0.58) 0%, rgba(232, 223, 210, 0.48) 100%)",
            borderColor: "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(14px) saturate(150%)",
            WebkitBackdropFilter: "blur(14px) saturate(150%)",
            boxShadow: "0 12px 30px rgba(30, 28, 26, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.65)",
          }}
        >
          <div className="mb-3" style={{ color: "var(--color-sage)" }}>
            {ICONS[demo.icon] ?? <ShoppingCart className="w-6 h-6" />}
          </div>
          <h3 className="font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            {demo.name}
          </h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
            {demo.description}
          </p>
          <Badge variant="secondary" style={{ background: "var(--color-sage-muted)", color: "var(--color-sage)", fontSize: "0.75rem" }}>
            {demo.rowCount} rows
          </Badge>
        </button>
      ))}
    </div>
  );
}
