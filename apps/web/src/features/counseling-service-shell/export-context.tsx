"use client";

import { createContext, useContext, useRef, useCallback } from "react";
import type { ReactNode } from "react";

type ExportFn = (() => Promise<void>) | null;

interface ExportContextValue {
  register: (fn: ExportFn) => void;
  trigger: () => Promise<void>;
}

const ExportContext = createContext<ExportContextValue>({
  register: () => {},
  trigger: async () => {},
});

export function ExportProvider({ children }: { children: ReactNode }) {
  const fnRef = useRef<ExportFn>(null);

  const register = useCallback((fn: ExportFn) => {
    fnRef.current = fn;
  }, []);

  const trigger = useCallback(async () => {
    await fnRef.current?.();
  }, []);

  return (
    <ExportContext.Provider value={{ register, trigger }}>
      {children}
    </ExportContext.Provider>
  );
}

export function useExport() {
  return useContext(ExportContext);
}
