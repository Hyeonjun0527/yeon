"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HomeSidebarLayoutContextValue = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (next: boolean) => void;
  toggleSidebarCollapsed: () => void;
  studentSidebarCollapsed: boolean;
  setStudentSidebarCollapsed: (next: boolean) => void;
  toggleStudentSidebarCollapsed: () => void;
};

const HomeSidebarLayoutContext =
  createContext<HomeSidebarLayoutContextValue | null>(null);

export function HomeSidebarLayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studentSidebarCollapsed, setStudentSidebarCollapsed] = useState(false);

  const value = useMemo<HomeSidebarLayoutContextValue>(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed: () => {
        setSidebarCollapsed((prev) => !prev);
      },
      studentSidebarCollapsed,
      setStudentSidebarCollapsed,
      toggleStudentSidebarCollapsed: () => {
        setStudentSidebarCollapsed((prev) => !prev);
      },
    }),
    [sidebarCollapsed, studentSidebarCollapsed],
  );

  return (
    <HomeSidebarLayoutContext.Provider value={value}>
      {children}
    </HomeSidebarLayoutContext.Provider>
  );
}

export function useHomeSidebarLayout() {
  const context = useContext(HomeSidebarLayoutContext);

  if (!context) {
    throw new Error("HomeSidebarLayoutProvider 내부에서 사용해야 합니다.");
  }

  return context;
}
