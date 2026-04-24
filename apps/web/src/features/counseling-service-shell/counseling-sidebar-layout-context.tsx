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

type CounselingSidebarSection = "records" | "students";
type CounselingTutorialKey = "home" | "student" | "check-board";
export type CounselingTutorialMode = "disabled" | "empty" | "full";

type CounselingTutorialPolicy = {
  mode: CounselingTutorialMode;
  showTrigger: boolean;
};

const DEFAULT_TUTORIAL_POLICY: CounselingTutorialPolicy = {
  mode: "disabled",
  showTrigger: false,
};

type CounselingSidebarLayoutContextValue = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (next: boolean) => void;
  toggleSidebarCollapsed: () => void;
  studentSidebarCollapsed: boolean;
  setStudentSidebarCollapsed: (next: boolean) => void;
  toggleStudentSidebarCollapsed: () => void;
  recordsSidebarToggleVisible: boolean;
  studentSidebarToggleVisible: boolean;
  setSidebarToggleVisibility: (
    section: CounselingSidebarSection,
    next: boolean,
  ) => void;
  tutorialPolicies: Record<CounselingTutorialKey, CounselingTutorialPolicy>;
  setTutorialPolicy: (
    key: CounselingTutorialKey,
    policy: CounselingTutorialPolicy,
  ) => void;
};

const CounselingSidebarLayoutContext =
  createContext<CounselingSidebarLayoutContextValue | null>(null);

export function CounselingSidebarLayoutProvider({
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
    Record<CounselingTutorialKey, CounselingTutorialPolicy>
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
    (section: CounselingSidebarSection, next: boolean) => {
      if (section === "records") {
        setRecordsSidebarToggleVisible(next);
        return;
      }

      setStudentSidebarToggleVisible(next);
    },
    [],
  );
  const setTutorialPolicy = useCallback(
    (key: CounselingTutorialKey, policy: CounselingTutorialPolicy) => {
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

  const value = useMemo<CounselingSidebarLayoutContextValue>(
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
    <CounselingSidebarLayoutContext.Provider value={value}>
      {children}
    </CounselingSidebarLayoutContext.Provider>
  );
}

export function useCounselingSidebarLayout() {
  const context = useContext(CounselingSidebarLayoutContext);

  if (!context) {
    throw new Error(
      "CounselingSidebarLayoutProvider 내부에서 사용해야 합니다.",
    );
  }

  return context;
}

export function useSidebarToggleVisibility(
  section: CounselingSidebarSection,
  canToggleSidebar: boolean,
) {
  const { setSidebarToggleVisibility } = useCounselingSidebarLayout();

  useEffect(() => {
    setSidebarToggleVisibility(section, canToggleSidebar);

    return () => {
      setSidebarToggleVisibility(section, false);
    };
  }, [canToggleSidebar, section, setSidebarToggleVisibility]);
}

export function useTutorialPolicy(
  key: CounselingTutorialKey,
): CounselingTutorialPolicy {
  const { tutorialPolicies } = useCounselingSidebarLayout();
  return tutorialPolicies[key];
}

export function useRegisterTutorialPolicy(
  key: CounselingTutorialKey,
  policy: CounselingTutorialPolicy,
) {
  const { setTutorialPolicy } = useCounselingSidebarLayout();

  useEffect(() => {
    setTutorialPolicy(key, policy);

    return () => {
      setTutorialPolicy(key, DEFAULT_TUTORIAL_POLICY);
    };
  }, [key, policy.mode, policy.showTrigger, setTutorialPolicy]);
}
