import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProtectedPageShell } from "@/components/protected-page-shell";
import { getDashboardsSetupMessage, isMissingDashboardsTableError } from "@/lib/supabase/dashboard-errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DashboardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("dashboards")
    .select("id,name,dataset_name,plan,kpis,charts,insights,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (isMissingDashboardsTableError(error)) {
    return (
      <ProtectedPageShell userEmail={user.email}>
        <div className="max-w-5xl mx-auto rounded-2xl p-6 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)" }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-sage-dark)" }}>
            Enable Saved Dashboards
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
            {getDashboardsSetupMessage()}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="underline" style={{ color: "var(--color-sage-dark)" }}>
              Back to workspace
            </Link>
            <span style={{ color: "var(--color-text-muted)" }}>
              File to run: supabase/schema.sql
            </span>
          </div>
        </div>
      </ProtectedPageShell>
    );
  }

  if (error || !data) {
    notFound();
  }

  return (
    <ProtectedPageShell userEmail={user.email} datasetName={data.dataset_name}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--color-sage-dark)" }}>{data.name}</h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{data.dataset_name} · Updated {new Date(data.updated_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard?resume=${data.id}`} className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--color-sage-dark)", color: "white" }}>
              Continue
            </Link>
            <Link href="/dashboards" className="px-3 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--color-surface-border)", color: "var(--color-sage-dark)", background: "rgba(255,255,255,0.7)" }}>
              Back
            </Link>
            <Link href="/dashboard" className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--color-sage)", color: "white" }}>
              Workspace
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl p-4 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)" }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>KPIs</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "var(--color-sage-dark)" }}>{Array.isArray(data.kpis) ? data.kpis.length : 0}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)" }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Charts</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "var(--color-sage-dark)" }}>{Array.isArray(data.charts) ? data.charts.length : 0}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)" }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Insights</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "var(--color-sage-dark)" }}>{Array.isArray(data.insights) ? data.insights.length : 0}</p>
          </div>
        </div>

        <div className="rounded-2xl p-5 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)" }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-sage-dark)" }}>Plan Summary</h2>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
            {typeof data.plan?.description === "string" ? data.plan.description : "No description available."}
          </p>

          {Array.isArray(data.insights) && data.insights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-sage-dark)" }}>Top Insights</h3>
              <ul className="space-y-2">
                {data.insights.slice(0, 5).map((insight: { text: string }, index: number) => (
                  <li key={`${index}-${insight.text}`} className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {insight.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProtectedPageShell>
  );
}
