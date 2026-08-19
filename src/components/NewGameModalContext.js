"use client";

import { createContext, useContext, useState } from "react";

const NewGameModalContext = createContext(null);

export function NewGameModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <NewGameModalContext.Provider value={{ open, openModal: () => setOpen(true), closeModal: () => setOpen(false) }}>
      {children}
    </NewGameModalContext.Provider>
  );
}

export function useNewGameModal() {
  const ctx = useContext(NewGameModalContext);
  if (!ctx) throw new Error("useNewGameModal must be used within NewGameModalProvider");
  return ctx;
}
