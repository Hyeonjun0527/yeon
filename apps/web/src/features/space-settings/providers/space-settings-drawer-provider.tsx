"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import { SpaceSettingsHubContent } from "../components/space-settings-hub-content";
import { SpacePeriodSettingsContent } from "../components/space-period-settings-content";
import { SpaceSettingsContent } from "../components/space-settings-content";

type SpaceSettingsView = "hub" | "period" | "configuration";

interface DrawerState {
  open: boolean;
  spaceId: string | null;
  initialTabId: string | null;
  view: SpaceSettingsView;
  onAfterClose: (() => void) | null;
}

interface OpenSpaceSettingsOptions {
  spaceId: string;
  initialTabId?: string | null;
  initialView?: SpaceSettingsView;
  onAfterClose?: () => void;
}

interface SpaceSettingsDrawerContextValue {
  open: boolean;
  spaceId: string | null;
  initialTabId: string | null;
  view: SpaceSettingsView;
  openSpaceSettings: (opts: OpenSpaceSettingsOptions) => void;
  closeSpaceSettings: () => void;
  showSpaceSettingsHub: () => void;
  showSpacePeriodSettings: () => void;
  showSpaceConfiguration: () => void;
}

const SpaceSettingsDrawerContext =
  createContext<SpaceSettingsDrawerContextValue | null>(null);

export function useSpaceSettingsDrawer() {
  const ctx = useContext(SpaceSettingsDrawerContext);
  if (!ctx)
    throw new Error(
      "useSpaceSettingsDrawer must be used within SpaceSettingsDrawerProvider",
    );
  return ctx;
}

export function SpaceSettingsDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedSpaceId } = useStudentManagement();
  const [state, setState] = useState<DrawerState>({
    open: false,
    spaceId: null,
    initialTabId: null,
    view: "hub",
    onAfterClose: null,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const openSpaceSettings = useCallback((opts: OpenSpaceSettingsOptions) => {
    if (!opts.spaceId) {
      console.warn(
        "[SpaceSettingsDrawer] spaceId is required to open settings",
      );
      return;
    }
    setState({
      open: true,
      spaceId: opts.spaceId,
      initialTabId: opts.initialTabId ?? null,
      view: opts.initialView ?? (opts.initialTabId ? "configuration" : "hub"),
      onAfterClose: opts.onAfterClose ?? null,
    });
  }, []);

  const closeSpaceSettings = useCallback(() => {
    const cb = stateRef.current.onAfterClose;
    setState((prev) => ({
      ...prev,
      open: false,
      view: "hub",
      onAfterClose: null,
    }));
    cb?.();
  }, []);

  const showSpaceSettingsHub = useCallback(() => {
    setState((prev) => ({ ...prev, view: "hub" }));
  }, []);

  const showSpacePeriodSettings = useCallback(() => {
    setState((prev) => ({ ...prev, view: "period" }));
  }, []);

  const showSpaceConfiguration = useCallback(() => {
    setState((prev) => ({ ...prev, view: "configuration" }));
  }, []);

  // selectedSpaceId가 열린 spaceId와 달라지면 강제 close
  useEffect(() => {
    if (stateRef.current.open && selectedSpaceId !== stateRef.current.spaceId) {
      closeSpaceSettings();
    }
  }, [selectedSpaceId, closeSpaceSettings]);

  return (
    <SpaceSettingsDrawerContext.Provider
      value={{
        open: state.open,
        spaceId: state.spaceId,
        initialTabId: state.initialTabId,
        view: state.view,
        openSpaceSettings,
        closeSpaceSettings,
        showSpaceSettingsHub,
        showSpacePeriodSettings,
        showSpaceConfiguration,
      }}
    >
      {children}
    </SpaceSettingsDrawerContext.Provider>
  );
}

export function SpaceSettingsDrawerHost() {
  const {
    open,
    spaceId,
    initialTabId,
    view,
    closeSpaceSettings,
    showSpaceSettingsHub,
    showSpacePeriodSettings,
    showSpaceConfiguration,
  } = useSpaceSettingsDrawer();
  const { spaces, refetchSpaces } = useStudentManagement();
  const currentSpace = spaces.find((s) => s.id === spaceId) ?? null;
  const spaceName = currentSpace?.name;
  const shellSizeClass =
    view === "configuration"
      ? "h-[min(88vh,960px)] w-[min(1120px,calc(100vw-32px))]"
      : view === "period"
        ? "max-h-[min(88vh,720px)] w-[min(560px,calc(100vw-32px))]"
        : "max-h-[min(88vh,420px)] w-[min(420px,calc(100vw-32px))]";

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeSpaceSettings();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeSpaceSettings]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
          onClick={closeSpaceSettings}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed left-1/2 top-1/2 z-[310] flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.5)] transition-all duration-200 ${shellSizeClass} ${
          open
            ? "pointer-events-auto opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-[0.98]"
        }`}
      >
        {open && spaceId ? (
          view === "hub" ? (
            <SpaceSettingsHubContent
              key={`${spaceId}-hub`}
              spaceName={spaceName}
              onOpenPeriod={showSpacePeriodSettings}
              onOpenConfiguration={showSpaceConfiguration}
              onClose={closeSpaceSettings}
            />
          ) : view === "period" ? (
            <SpacePeriodSettingsContent
              key={`${spaceId}-period`}
              spaceId={spaceId}
              spaceName={spaceName}
              spaceStartDate={currentSpace?.startDate ?? null}
              spaceEndDate={currentSpace?.endDate ?? null}
              onBack={showSpaceSettingsHub}
              onClose={closeSpaceSettings}
              onSpaceUpdated={refetchSpaces}
            />
          ) : (
            <SpaceSettingsContent
              key={`${spaceId}-configuration`}
              spaceId={spaceId}
              spaceName={spaceName}
              initialTabId={initialTabId}
              onBack={showSpaceSettingsHub}
              onClose={closeSpaceSettings}
            />
          )
        ) : null}
      </div>
    </>
  );
}
