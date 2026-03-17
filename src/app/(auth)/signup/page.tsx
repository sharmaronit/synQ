"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    setMessage("Account created. Check your email to verify and continue.");
  }

  return (
    <div className="upload-animated-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: "rgba(250,246,240,0.82)", borderColor: "var(--color-surface-border)", boxShadow: "0 18px 50px rgba(30,28,26,0.18)" }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-sage-dark)" }}>Create account</h1>
        <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>Start saving dashboards to your workspace.</p>

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
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full h-10 px-3 rounded-lg border"
            style={{ borderColor: "var(--color-surface-border)", background: "rgba(255,255,255,0.7)" }}
          />
          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
          {message && <p className="text-sm" style={{ color: "var(--color-sage-dark)" }}>{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: "var(--color-sage)" }}
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-5 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Link href="/login" className="underline">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
}
