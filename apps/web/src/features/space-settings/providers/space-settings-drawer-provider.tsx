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
import { SpaceSettingsContent } from "../components/space-settings-content";

interface DrawerState {
  open: boolean;
  spaceId: string | null;
  initialTabId: string | null;
  onAfterClose: (() => void) | null;
}

interface OpenSpaceSettingsOptions {
  spaceId: string;
  initialTabId?: string | null;
  onAfterClose?: () => void;
}

interface SpaceSettingsDrawerContextValue {
  open: boolean;
  spaceId: string | null;
  initialTabId: string | null;
  openSpaceSettings: (opts: OpenSpaceSettingsOptions) => void;
  closeSpaceSettings: () => void;
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
      onAfterClose: opts.onAfterClose ?? null,
    });
  }, []);

  const closeSpaceSettings = useCallback(() => {
    const cb = stateRef.current.onAfterClose;
    setState((prev) => ({ ...prev, open: false, onAfterClose: null }));
    cb?.();
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
        openSpaceSettings,
        closeSpaceSettings,
      }}
    >
      {children}
    </SpaceSettingsDrawerContext.Provider>
  );
}

export function SpaceSettingsDrawerHost() {
  const { open, spaceId, initialTabId, closeSpaceSettings } =
    useSpaceSettingsDrawer();
  const { spaces } = useStudentManagement();
  const spaceName = spaces.find((s) => s.id === spaceId)?.name;

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
        className={`fixed right-0 top-0 h-full w-full max-w-[800px] z-[310] bg-surface border-l border-border shadow-[0_24px_64px_rgba(0,0,0,0.5)] flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {open && spaceId && (
          <SpaceSettingsContent
            key={spaceId}
            spaceId={spaceId}
            spaceName={spaceName}
            initialTabId={initialTabId}
            onClose={closeSpaceSettings}
          />
        )}
      </div>
    </>
  );
}
