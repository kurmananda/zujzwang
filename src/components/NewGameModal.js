"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNewGameModal } from "@/components/NewGameModalContext";
import NewGameForm from "@/components/NewGameForm";
import { XIcon, SwordsIcon } from "@/components/icons";

export default function NewGameModal() {
  const { open, closeModal } = useNewGameModal();
  const router = useRouter();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closeModal]);

  if (!open) return null;

  function handleDone() {
    closeModal();
    router.refresh();
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (!panelRef.current?.contains(e.target)) closeModal();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="modal-panel card-surface flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/[.06] px-6 py-5 dark:border-white/[.08]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-amber-300 shadow-sm">
              <SwordsIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight">Report a Game</h2>
              <p className="text-xs text-zinc-500">Your opponent confirms before ratings move.</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            aria-label="Close"
            className="icon-btn -mr-1 -mt-1 shrink-0"
          >
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <NewGameForm onDone={handleDone} />
        </div>
      </div>
    </div>
  );
}
