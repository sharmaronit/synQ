import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProtectedPageShell } from "@/components/protected-page-shell";
import { getDashboardsSetupMessage, isMissingDashboardsTableError } from "@/lib/supabase/dashboard-errors";

export default async function DashboardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("dashboards")
    .select("id,name,dataset_name,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    const isSetupRequired = isMissingDashboardsTableError(error);

    return (
      <ProtectedPageShell userEmail={user.email}>
        <div className="max-w-5xl mx-auto rounded-2xl p-6 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)" }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-sage-dark)" }}>
            {isSetupRequired ? "Enable Saved Dashboards" : "Failed to load dashboards"}
          </h1>
          <p className="text-sm mb-4" style={{ color: isSetupRequired ? "var(--color-text-muted)" : "var(--color-danger)" }}>
            {isSetupRequired ? getDashboardsSetupMessage() : error.message}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="underline" style={{ color: "var(--color-sage-dark)" }}>
              Back to workspace
            </Link>
            {isSetupRequired && (
              <span style={{ color: "var(--color-text-muted)" }}>
                File to run: supabase/schema.sql
              </span>
            )}
          </div>
        </div>
      </ProtectedPageShell>
    );
  }

  return (
    <ProtectedPageShell userEmail={user.email}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--color-sage-dark)" }}>Saved Dashboards</h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Select a dashboard to view and compare.</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--color-sage)", color: "white" }}>
            Open Workspace
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data ?? []).map((dashboard) => (
            <div
              key={dashboard.id}
              className="rounded-2xl p-4 border transition-all duration-150 hover:-translate-y-0.5"
              style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)", boxShadow: "0 8px 24px rgba(30,28,26,0.10)" }}
            >
              <h2 className="text-lg font-semibold truncate" style={{ color: "var(--color-sage-dark)" }}>{dashboard.name}</h2>
              <p className="text-sm mt-1 truncate" style={{ color: "var(--color-text-muted)" }}>{dashboard.dataset_name}</p>
              <p className="text-xs mt-3" style={{ color: "var(--color-text-muted)" }}>Updated {new Date(dashboard.updated_at).toLocaleString()}</p>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <Link href={`/dashboards/${dashboard.id}`} className="underline" style={{ color: "var(--color-sage-dark)" }}>
                  View details
                </Link>
                <Link href={`/dashboard?resume=${dashboard.id}`} className="px-3 py-1.5 rounded-lg font-semibold" style={{ background: "var(--color-sage)", color: "white" }}>
                  Continue
                </Link>
              </div>
            </div>
          ))}
        </div>

        {(data ?? []).length === 0 && (
          <div className="rounded-2xl p-8 border text-center mt-6" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No saved dashboards yet. Save one from your workspace.</p>
            <Link href="/dashboard" className="inline-block mt-3 underline text-sm" style={{ color: "var(--color-sage-dark)" }}>
              Go to workspace
            </Link>
          </div>
        )}
      </div>
    </ProtectedPageShell>
  );
}
