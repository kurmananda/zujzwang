"use client";

import { useRouter } from "next/navigation";
import NewGameForm from "@/components/NewGameForm";
import { SwordsIcon } from "@/components/icons";

export default function NewMatchPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm">
          <SwordsIcon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">New Friendly Game</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your opponent gets notified and confirms before ratings move.
          </p>
        </div>
      </div>

      <div className="card-surface mt-6 rounded-2xl p-6">
        <NewGameForm onDone={() => { router.push("/matches"); router.refresh(); }} />
      </div>
    </div>
  );
}
