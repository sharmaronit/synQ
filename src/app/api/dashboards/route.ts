import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SavedDashboardPayload } from "@/types";
import { getDashboardsSetupMessage, isMissingDashboardsTableError } from "@/lib/supabase/dashboard-errors";

function isPayload(value: unknown): value is SavedDashboardPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as SavedDashboardPayload;

  return (
    typeof payload.name === "string" &&
    typeof payload.datasetName === "string" &&
    typeof payload.plan === "object" &&
    Array.isArray(payload.kpis) &&
    Array.isArray(payload.charts) &&
    Array.isArray(payload.tableColumns) &&
    Array.isArray(payload.insights)
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dashboards")
    .select("id,name,dataset_name,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingDashboardsTableError(error)) {
      return NextResponse.json({ message: getDashboardsSetupMessage(), setupRequired: true }, { status: 503 });
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const dashboards = (data ?? []).map((dashboard) => ({
    id: dashboard.id,
    name: dashboard.name,
    datasetName: dashboard.dataset_name,
    createdAt: dashboard.created_at,
    updatedAt: dashboard.updated_at,
  }));

  return NextResponse.json({ dashboards });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!isPayload(body)) {
    return NextResponse.json({ message: "Invalid dashboard payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dashboards")
    .insert({
      user_id: user.id,
      name: body.name,
      dataset_name: body.datasetName,
      plan: body.plan,
      kpis: body.kpis,
      charts: body.charts,
      table_columns: body.tableColumns,
      insights: body.insights,
    })
    .select("id,name,dataset_name,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingDashboardsTableError(error)) {
      return NextResponse.json({ message: `${getDashboardsSetupMessage()} Your dashboard snapshot is still saved locally in this browser.`, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      dashboard: {
        id: data.id,
        name: data.name,
        datasetName: data.dataset_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    },
    { status: 201 }
  );
}
