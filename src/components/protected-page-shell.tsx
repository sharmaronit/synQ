"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/navbar";

type ProtectedPageShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  datasetName?: string;
};

export function ProtectedPageShell({ children, userEmail, datasetName }: ProtectedPageShellProps) {
  const router = useRouter();

  const handleOpenSavedDashboards = useCallback(() => {
    router.push("/dashboards");
  }, [router]);

  const handleSwitchAccount = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="upload-animated-bg min-h-screen relative">
      <div className="absolute top-0 left-0 right-0 px-4 pt-3 pb-2 z-50 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[1280px] mx-auto">
          <Navbar
            datasetName={datasetName}
            userEmail={userEmail}
            onHome={() => router.push("/dashboards")}
            onOpenSavedDashboards={handleOpenSavedDashboards}
            onSwitchAccount={handleSwitchAccount}
            onSignOut={handleSwitchAccount}
          />
        </div>
      </div>

      <div className="px-6 pt-24 pb-6">{children}</div>
    </div>
  );
}