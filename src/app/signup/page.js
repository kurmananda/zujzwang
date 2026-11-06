"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", scCode: "", chessComUsername: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? "Signup failed.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/leaderboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-2xl border border-black/[.08] bg-white/60 p-8 shadow-sm backdrop-blur-sm dark:border-white/[.1] dark:bg-white/[.03]">
        <h1 className="text-2xl font-semibold tracking-tight">Join Zugzwang</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Join the college chess club. Your Chess.com username is verified live and its avatar becomes your
          profile photo — no separate photo upload needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Full Name" value={form.name} onChange={update("name")} required />
          <Field label="SC Code (college ID)" value={form.scCode} onChange={update("scCode")} required />
          <Field label="Chess.com Username" value={form.chessComUsername} onChange={update("chessComUsername")} required />
          <Field label="Email" type="email" value={form.email} onChange={update("email")} required />
          <Field label="Password" type="password" value={form.password} onChange={update("password")} required minLength={6} />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-900/25 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">
          Already have an account? <a href="/login" className="font-medium text-amber-700 hover:underline dark:text-amber-400">Log in</a>
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 dark:border-white/[.2]"
      />
    </div>
  );
}
