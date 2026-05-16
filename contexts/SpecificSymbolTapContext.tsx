"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface SpecificSymbolTapContextValue {
  openStem: string | null;
  toggleStem: (stem: string) => void;
}

const SpecificSymbolTapContext = createContext<SpecificSymbolTapContextValue | null>(null);

export function SpecificSymbolTapProvider({ children }: { children: React.ReactNode }) {
  const [openStem, setOpenStem] = useState<string | null>(null);

  const toggleStem = useCallback((stem: string) => {
    setOpenStem((prev) => (prev === stem ? null : stem));
  }, []);

  useEffect(() => {
    if (!openStem) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-specific-symbol-trigger]")) return;
      setOpenStem(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openStem]);

  const value = useMemo(
    () => ({ openStem, toggleStem }),
    [openStem, toggleStem],
  );

  return (
    <SpecificSymbolTapContext.Provider value={value}>{children}</SpecificSymbolTapContext.Provider>
  );
}

export function useSpecificSymbolTap(): SpecificSymbolTapContextValue {
  const ctx = useContext(SpecificSymbolTapContext);
  if (!ctx) {
    return {
      openStem: null,
      toggleStem: () => {},
    };
  }
  return ctx;
}
