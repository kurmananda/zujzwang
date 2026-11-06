"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/leaderboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md items-center px-6 py-12">
      <div className="w-full rounded-2xl border border-black/[.08] bg-white/60 p-8 shadow-sm backdrop-blur-sm dark:border-white/[.1] dark:bg-white/[.03]">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-500">Log in to Zugzwang to report games and check ratings.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-900/25 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">
          No account yet? <a href="/signup" className="font-medium text-amber-700 hover:underline dark:text-amber-400">Sign up</a>
        </p>
      </div>
    </div>
  );
}
