import { Suspense } from "react";
import DashboardApp from "@/components/dashboard-app";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <DashboardApp />
    </Suspense>
  );
}
