"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import type { RecordItem } from "../_lib/types";

// ---------------------------------------------------------------------------
// 선택 상태의 단일 source of truth (discriminated union)
//
// - member / record 선택을 하나의 state로 관리 → 동시 선택 구조적 불가
// - setState 1회 = 원자적 전이 → 레이스 불가
// - Next.js navigation hook 미사용 → transition re-render 없음
// ---------------------------------------------------------------------------

export type ActiveSelection =
  | { kind: "none" }
  | { kind: "member"; id: string }
  | { kind: "record"; id: string };

interface SelectionDeps {
  currentSpaceId: string | null;
  /** ref: useRecords.ensureDetail (순환 의존 해소) */
  ensureDetailRef: MutableRefObject<(id: string) => void>;
  /** ref: useAudioPlayer.reset (순환 의존 해소) */
  resetAudioRef: MutableRefObject<() => void>;
}

// ── URL 헬퍼 (모듈 스코프, hook 외부) ─────────────────────────────
function buildUrl(memberId: string | null, recordId: string | null): string {
  const params = new URLSearchParams();
  if (memberId) params.set("memberId", memberId);
  if (recordId) params.set("recordId", recordId);
  const query = params.toString();
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return query ? `${path}?${query}` : path;
}

export function useWorkspaceSelection(deps: SelectionDeps) {
  // ── 단일 선택 상태 ─────────────────────────────────────────────
  const [active, setActive] = useState<ActiveSelection>({ kind: "none" });

  const selectedMemberId = active.kind === "member" ? active.id : null;
  const selectedRecordId = active.kind === "record" ? active.id : null;

  // ── refs ───────────────────────────────────────────────────────
  const currentSpaceIdRef = useRef(deps.currentSpaceId);
  currentSpaceIdRef.current = deps.currentSpaceId;

  // ── URL 동기 헬퍼 (완전 안정 참조) ──────────────────────────────
  const replaceUrl = useCallback(
    (memberId: string | null, recordId: string | null) => {
      const nextUrl = buildUrl(memberId, recordId);

      if (typeof window === "undefined") {
        return;
      }

      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl === nextUrl) {
        return;
      }

      window.history.replaceState(null, "", nextUrl);
    },
    [],
  );

  // ── 선택 상태(memberId/recordId)만 URL 반영 ───────────────────
  // spaceId를 클릭할 때마다 search param을 갱신하면 App Router commit이 커져
  // dropdown 선택 한 번에 상위 route tree가 다시 커밋된다.
  // 현재 스페이스는 localStorage + 로컬 state로 유지하고, URL은 실제 상세 선택만 표현한다.
  const prevSyncKeyRef = useRef("");
  useEffect(() => {
    const key = `${selectedMemberId}|${selectedRecordId}`;
    if (key === prevSyncKeyRef.current) return;
    prevSyncKeyRef.current = key;
    replaceUrl(selectedMemberId, selectedRecordId);
  }, [replaceUrl, selectedMemberId, selectedRecordId]);

  // ── URL 초기화 (page.tsx에서 records 로드 후 호출) ──────────────
  const urlInitializedRef = useRef(false);
  const initFromUrl = useCallback(
    (records: RecordItem[]) => {
      if (urlInitializedRef.current) return;
      if (typeof window === "undefined") {
        urlInitializedRef.current = true;
        return;
      }
      const params = new URLSearchParams(window.location.search);

      const memberId = params.get("memberId");
      if (memberId) {
        setActive({ kind: "member", id: memberId });
        urlInitializedRef.current = true;
        return;
      }

      const recordId = params.get("recordId");
      if (!recordId) {
        urlInitializedRef.current = true;
        return;
      }

      if (records.some((r) => r.id === recordId)) {
        setActive({ kind: "record", id: recordId });
        deps.resetAudioRef.current();
        deps.ensureDetailRef.current(recordId);
        urlInitializedRef.current = true;
      }
      // recordId가 있지만 아직 로드 안 된 경우 → 호출자가 재시도
    },
    [deps.ensureDetailRef, deps.resetAudioRef],
  );

  // ── 선택 핸들러 ─────────────────────────────────────────────────
  // replaceUrl은 핸들러에서 호출하지 않는다.
  // 핸들러 안에서 replaceState를 호출하면 Next.js가 transition을 스케줄링하고
  // HomeNavShell의 usePathname()을 통해 전체 트리를 re-render시킨다.
  // 141명 re-render가 메인 스레드를 블록하면서 다음 클릭이 밀린다.
  // URL 동기화는 위의 effect가 렌더 후 한 번만 처리한다.

  /** 사이드바 record 클릭 (audio reset + detail fetch 포함) */
  const handleSelectRecord = useCallback(
    (id: string) => {
      setActive({ kind: "record", id });
      deps.resetAudioRef.current();
      deps.ensureDetailRef.current(id);
    },
    [deps.resetAudioRef, deps.ensureDetailRef],
  );

  /** 사이드바 member 클릭 */
  const handleSelectMember = useCallback((id: string) => {
    setActive({ kind: "member", id });
  }, []);

  /** 프로그래밍 경로: record 선택 (audio/detail 생략) */
  const selectRecord = useCallback((id: string) => {
    setActive({ kind: "record", id });
  }, []);

  /** 프로그래밍 경로: member 선택 */
  const selectMember = useCallback((id: string) => {
    setActive({ kind: "member", id });
  }, []);

  /** 전체 해제 */
  const clearAll = useCallback(() => {
    setActive({ kind: "none" });
  }, []);

  /** 특정 member가 선택된 상태면 해제 */
  const clearMemberIfSelected = useCallback((memberId: string) => {
    setActive((prev) =>
      prev.kind === "member" && prev.id === memberId ? { kind: "none" } : prev,
    );
  }, []);

  /** 특정 record가 선택된 상태면 해제 */
  const clearRecordIfSelected = useCallback((recordId: string) => {
    setActive((prev) =>
      prev.kind === "record" && prev.id === recordId ? { kind: "none" } : prev,
    );
  }, []);

  /** record ID 교체 (temp → real 전환) */
  const replaceSelectedRecordId = useCallback(
    (oldId: string, newId: string) => {
      setActive((prev) =>
        prev.kind === "record" && prev.id === oldId
          ? { kind: "record", id: newId }
          : prev,
      );
    },
    [],
  );

  return {
    active,
    selectedMemberId,
    selectedRecordId,
    handleSelectRecord,
    handleSelectMember,
    selectRecord,
    selectMember,
    clearAll,
    clearMemberIfSelected,
    clearRecordIfSelected,
    replaceSelectedRecordId,
    initFromUrl,
  };
}
