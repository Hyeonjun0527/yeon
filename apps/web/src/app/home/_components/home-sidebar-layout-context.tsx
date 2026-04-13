"use client";

import {
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HomeSidebarSection = "records" | "students";
type HomeTutorialKey = "home" | "student" | "check-board";
export type HomeTutorialMode = "disabled" | "empty" | "full";

type HomeTutorialPolicy = {
  mode: HomeTutorialMode;
  showTrigger: boolean;
};

const DEFAULT_TUTORIAL_POLICY: HomeTutorialPolicy = {
  mode: "disabled",
  showTrigger: false,
};

type HomeSidebarLayoutContextValue = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (next: boolean) => void;
  toggleSidebarCollapsed: () => void;
  studentSidebarCollapsed: boolean;
  setStudentSidebarCollapsed: (next: boolean) => void;
  toggleStudentSidebarCollapsed: () => void;
  recordsSidebarToggleVisible: boolean;
  studentSidebarToggleVisible: boolean;
  setSidebarToggleVisibility: (
    section: HomeSidebarSection,
    next: boolean,
  ) => void;
  tutorialPolicies: Record<HomeTutorialKey, HomeTutorialPolicy>;
  setTutorialPolicy: (key: HomeTutorialKey, policy: HomeTutorialPolicy) => void;
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
  const [recordsSidebarToggleVisible, setRecordsSidebarToggleVisible] =
    useState(false);
  const [studentSidebarToggleVisible, setStudentSidebarToggleVisible] =
    useState(false);
  const [tutorialPolicies, setTutorialPolicies] = useState<
    Record<HomeTutorialKey, HomeTutorialPolicy>
  >({
    home: DEFAULT_TUTORIAL_POLICY,
    student: DEFAULT_TUTORIAL_POLICY,
    "check-board": DEFAULT_TUTORIAL_POLICY,
  });
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);
  const toggleStudentSidebarCollapsed = useCallback(() => {
    setStudentSidebarCollapsed((prev) => !prev);
  }, []);
  const setSidebarToggleVisibility = useCallback(
    (section: HomeSidebarSection, next: boolean) => {
      if (section === "records") {
        setRecordsSidebarToggleVisible(next);
        return;
      }

      setStudentSidebarToggleVisible(next);
    },
    [],
  );
  const setTutorialPolicy = useCallback(
    (key: HomeTutorialKey, policy: HomeTutorialPolicy) => {
      setTutorialPolicies((current) => {
        const previous = current[key];
        if (
          previous.mode === policy.mode &&
          previous.showTrigger === policy.showTrigger
        ) {
          return current;
        }

        return { ...current, [key]: policy };
      });
    },
    [],
  );

  const value = useMemo<HomeSidebarLayoutContextValue>(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      studentSidebarCollapsed,
      setStudentSidebarCollapsed,
      toggleStudentSidebarCollapsed,
      recordsSidebarToggleVisible,
      studentSidebarToggleVisible,
      setSidebarToggleVisibility,
      tutorialPolicies,
      setTutorialPolicy,
    }),
    [
      recordsSidebarToggleVisible,
      sidebarCollapsed,
      setSidebarToggleVisibility,
      setTutorialPolicy,
      studentSidebarCollapsed,
      studentSidebarToggleVisible,
      toggleSidebarCollapsed,
      toggleStudentSidebarCollapsed,
      tutorialPolicies,
    ],
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

export function useSidebarToggleVisibility(
  section: HomeSidebarSection,
  canToggleSidebar: boolean,
) {
  const { setSidebarToggleVisibility } = useHomeSidebarLayout();

  useEffect(() => {
    setSidebarToggleVisibility(section, canToggleSidebar);

    return () => {
      setSidebarToggleVisibility(section, false);
    };
  }, [canToggleSidebar, section, setSidebarToggleVisibility]);
}

export function useTutorialPolicy(key: HomeTutorialKey): HomeTutorialPolicy {
  const { tutorialPolicies } = useHomeSidebarLayout();
  return tutorialPolicies[key];
}

export function useRegisterTutorialPolicy(
  key: HomeTutorialKey,
  policy: HomeTutorialPolicy,
) {
  const { setTutorialPolicy } = useHomeSidebarLayout();

  useEffect(() => {
    setTutorialPolicy(key, policy);

    return () => {
      setTutorialPolicy(key, DEFAULT_TUTORIAL_POLICY);
    };
  }, [key, policy.mode, policy.showTrigger, setTutorialPolicy]);
}
