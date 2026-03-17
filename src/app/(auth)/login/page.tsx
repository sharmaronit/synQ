"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SynqLogo } from "@/components/synq-logo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") ?? "/dashboard", [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function onGoogleSignIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (oauthError) {
      setLoading(false);
      setError(oauthError.message);
    }
  }

  return (
    <div className="upload-animated-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)", boxShadow: "0 18px 50px rgba(30,28,26,0.18)" }}>
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(232,223,210,0.72) 100%)",
              boxShadow: "0 10px 28px rgba(30,28,26,0.12)",
            }}
          >
            <SynqLogo className="w-9 h-9" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] mb-2" style={{ color: "var(--color-text-muted)" }}>
            synQ Analytics Workspace
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-sage-dark)", fontFamily: '"Playfair Display", serif' }}>
            Welcome to synQ
          </h1>
          <p className="text-sm max-w-sm" style={{ color: "var(--color-text-muted)" }}>
            Sign in to ask questions, generate dashboards, and access your saved synQ workspaces.
          </p>
        </div>

        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-sage-dark)" }}>Login</h1>
        <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>Continue to your dashboards.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border"
            style={{ borderColor: "var(--color-surface-border)", background: "rgba(255,255,255,0.7)" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border"
            style={{ borderColor: "var(--color-surface-border)", background: "rgba(255,255,255,0.7)" }}
          />
          {error && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: "var(--color-sage)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={loading}
          className="w-full h-10 mt-3 rounded-lg border text-sm font-semibold cursor-pointer disabled:opacity-60"
          style={{ borderColor: "var(--color-surface-border)", color: "var(--color-text-primary)", background: "rgba(255,255,255,0.7)" }}
        >
          Continue with Google
        </button>

        <div className="mt-5 text-sm flex items-center justify-between" style={{ color: "var(--color-text-muted)" }}>
          <Link href="/signup" className="underline">Create account</Link>
          <Link href="/forgot-password" className="underline">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
