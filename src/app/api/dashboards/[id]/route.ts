import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SavedDashboardPayload } from "@/types";
import { getDashboardsSetupMessage, isMissingDashboardsTableError } from "@/lib/supabase/dashboard-errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isPartialPayload(value: unknown): value is Partial<SavedDashboardPayload> {
  if (!value || typeof value !== "object") return false;
  return true;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dashboards")
    .select("id,name,dataset_name,plan,kpis,charts,table_columns,insights,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (isMissingDashboardsTableError(error)) {
    return NextResponse.json({ message: getDashboardsSetupMessage(), setupRequired: true }, { status: 503 });
  }

  if (error || !data) {
    return NextResponse.json({ message: "Dashboard not found" }, { status: 404 });
  }

  return NextResponse.json({
    dashboard: {
      id: data.id,
      name: data.name,
      datasetName: data.dataset_name,
      plan: data.plan,
      kpis: data.kpis,
      charts: data.charts,
      tableColumns: data.table_columns,
      insights: data.insights,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!isPartialPayload(body)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.datasetName === "string") updates.dataset_name = body.datasetName;
  if (body.plan) updates.plan = body.plan;
  if (body.kpis) updates.kpis = body.kpis;
  if (body.charts) updates.charts = body.charts;
  if (body.tableColumns) updates.table_columns = body.tableColumns;
  if (body.insights) updates.insights = body.insights;

  const { data, error } = await supabase
    .from("dashboards")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,name,dataset_name,updated_at")
    .single();

  if (isMissingDashboardsTableError(error)) {
    return NextResponse.json({ message: getDashboardsSetupMessage(), setupRequired: true }, { status: 503 });
  }

  if (error || !data) {
    return NextResponse.json({ message: "Failed to update dashboard" }, { status: 400 });
  }

  return NextResponse.json({
    dashboard: {
      id: data.id,
      name: data.name,
      datasetName: data.dataset_name,
      updatedAt: data.updated_at,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("dashboards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (isMissingDashboardsTableError(error)) {
      return NextResponse.json({ message: getDashboardsSetupMessage(), setupRequired: true }, { status: 503 });
    }

    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
