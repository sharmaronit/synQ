type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
};

export function isMissingDashboardsTableError(error: SupabaseLikeError | null | undefined) {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST205" || message.includes("public.dashboards") || message.includes("schema cache");
}

export function getDashboardsSetupMessage() {
  return "Saved dashboards are not enabled yet for this project. Run the SQL in supabase/schema.sql in your Supabase SQL editor, then refresh this page.";
}