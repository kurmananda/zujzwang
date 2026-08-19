"use client";

import { useNewGameModal } from "@/components/NewGameModalContext";
import { PlusIcon } from "@/components/icons";

export default function FloatingNewGameButton() {
  const { openModal } = useNewGameModal();

  return (
    <button
      onClick={openModal}
      className="fab-btn group fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full py-3.5 pl-4 pr-5 text-sm font-bold text-emerald-950"
    >
      <span className="fab-ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/10 transition-transform duration-300 group-hover:rotate-90">
        <PlusIcon className="h-4 w-4" />
      </span>
      <span className="hidden sm:inline">New Game</span>
    </button>
  );
}
