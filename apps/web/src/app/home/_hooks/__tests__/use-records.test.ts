// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useRecords } from "../use-records";
import type { RecordItem } from "../../_lib/types";

/* ── fetch 모킹 ── */

function mockFetch(responses: Record<string, unknown>) {
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const match = Object.entries(responses).find(([pattern]) =>
      url.includes(pattern),
    );
    const body = match ? match[1] : { records: [] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

/* ── 헬퍼 ── */

function makeServerRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec-001",
    spaceId: "space-1",
    memberId: null,
    studentName: "김철수",
    sessionTitle: "3월 멘토링",
    counselingType: "1:1",
    status: "ready",
    preview: "요약입니다",
    audioDurationMs: 60000,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTempRecord(overrides: Partial<RecordItem> = {}): RecordItem {
  return {
    id: "temp-001",
    spaceId: null,
    memberId: null,
    createdAt: new Date().toISOString(),
    title: "처리 중",
    status: "processing" as const,
    errorMessage: null,
    meta: "수강생 미지정",
    duration: "0:00",
    durationMs: 0,
    studentName: "",
    type: "",
    audioUrl: null,
    transcript: [],
    aiSummary: "",
    aiMessages: [],
    analysisResult: null,
    processingStage: "queued" as const,
    processingProgress: 5,
    processingMessage: "업로드를 준비하고 있습니다.",
    analysisStatus: "idle" as const,
    analysisProgress: 0,
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ── 초기 상태 ── */

describe("초기 상태", () => {
  it("서버에 레코드가 없으면 phase가 'empty'다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    expect(result.current.viewState.kind).toBe("empty");
    expect(result.current.records).toHaveLength(0);
  });

  it("서버에 레코드가 있으면 viewState가 'ready'가 된다", async () => {
    mockFetch({
      "/api/v1/counseling-records": { records: [makeServerRecord()] },
    });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    expect(result.current.viewState.kind).toBe("ready");
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0].title).toBe("3월 멘토링");
  });

  it("selected가 null로 초기화된다", () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.selected).toBeNull();
  });
});

/* ── addProcessingRecord ── */

describe("addProcessingRecord", () => {
  it("임시 레코드를 목록에 추가한다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    const tempRec = makeTempRecord();
    act(() => {
      result.current.addProcessingRecord(tempRec);
    });

    expect(result.current.records.some((r) => r.id === "temp-001")).toBe(true);
  });

  it("selectedRecordId가 processing 레코드를 가리키면 viewState가 processing이 된다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result, rerender } = renderHook(
      ({ selectedId }: { selectedId: string | null }) => useRecords(selectedId),
      {
        wrapper: createWrapper(),
        initialProps: { selectedId: null as string | null },
      },
    );

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    const tempRec = makeTempRecord();
    act(() => {
      result.current.addProcessingRecord(tempRec);
    });

    rerender({ selectedId: "temp-001" });

    expect(result.current.viewState.kind).toBe("processing");
    expect(result.current.selected?.id).toBe("temp-001");
  });

  it("같은 ID를 두 번 추가해도 중복되지 않는다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    const tempRec = makeTempRecord();
    act(() => {
      result.current.addProcessingRecord(tempRec);
      result.current.addProcessingRecord(tempRec);
    });

    const count = result.current.records.filter(
      (r) => r.id === "temp-001",
    ).length;
    expect(count).toBe(1);
  });
});

/* ── replaceRecord ── */

describe("replaceRecord", () => {
  it("임시 레코드를 실제 레코드로 교체한다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    const tempRec = makeTempRecord({ id: "temp-xyz" });
    act(() => {
      result.current.addProcessingRecord(tempRec);
    });

    const realRec = makeTempRecord({ id: "real-001", status: "processing" });
    act(() => {
      result.current.replaceRecord("temp-xyz", realRec);
    });

    expect(result.current.records.some((r) => r.id === "temp-xyz")).toBe(false);
    expect(result.current.records.some((r) => r.id === "real-001")).toBe(true);
  });
});

/* ── markUploadError ── */

describe("markUploadError", () => {
  it("임시 레코드를 error 상태로 표시한다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    const tempRec = makeTempRecord({ id: "temp-fail" });
    act(() => {
      result.current.addProcessingRecord(tempRec);
    });

    act(() => {
      result.current.markUploadError("temp-fail", "네트워크 오류");
    });

    const rec = result.current.records.find((r) => r.id === "temp-fail");
    expect(rec?.status).toBe("error");
    expect(rec?.errorMessage).toBe("네트워크 오류");
  });
});

/* ── updateMessages / clearMessages ── */

describe("updateMessages", () => {
  it("레코드의 aiMessages를 로컬 오버라이드로 업데이트한다", async () => {
    mockFetch({
      "/api/v1/counseling-records": {
        records: [makeServerRecord({ id: "rec-msg" })],
      },
    });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.records).toHaveLength(1));

    act(() => {
      result.current.updateMessages("rec-msg", () => [
        { role: "user", text: "안녕" },
      ]);
    });

    const rec = result.current.records.find((r) => r.id === "rec-msg");
    expect(rec?.aiMessages).toHaveLength(1);
    expect(rec?.aiMessages[0].text).toBe("안녕");
  });

  it("clearMessages 호출 후 aiMessages가 빈 배열이 된다", async () => {
    mockFetch({
      "/api/v1/counseling-records": {
        records: [makeServerRecord({ id: "rec-clr" })],
      },
    });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.records).toHaveLength(1));

    act(() => {
      result.current.updateMessages("rec-clr", () => [
        { role: "user", text: "테스트" },
      ]);
    });
    await act(async () => {
      await result.current.clearMessages("rec-clr");
    });

    const rec = result.current.records.find((r) => r.id === "rec-clr");
    expect(rec?.aiMessages).toHaveLength(0);
  });
});

/* ── updateMemberId ── */

describe("updateMemberId", () => {
  it("레코드의 memberId를 로컬 오버라이드로 업데이트한다", async () => {
    mockFetch({
      "/api/v1/counseling-records": {
        records: [makeServerRecord({ id: "rec-member", memberId: null })],
      },
    });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.records).toHaveLength(1));

    act(() => {
      result.current.updateMemberId("rec-member", "member-99");
    });

    const rec = result.current.records.find((r) => r.id === "rec-member");
    expect(rec?.memberId).toBe("member-99");
  });

  it("null로 업데이트하면 수강생 연결이 해제된다", async () => {
    mockFetch({
      "/api/v1/counseling-records": {
        records: [makeServerRecord({ id: "rec-unlink", memberId: "member-1" })],
      },
    });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.records).toHaveLength(1));

    act(() => {
      result.current.updateMemberId("rec-unlink", null);
    });

    const rec = result.current.records.find((r) => r.id === "rec-unlink");
    expect(rec?.memberId).toBeNull();
  });
});

/* ── removeRecord ── */

describe("removeRecord", () => {
  it("레코드를 제거한다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    const tempRec = makeTempRecord({ id: "temp-del" });
    act(() => {
      result.current.addProcessingRecord(tempRec);
    });

    act(() => {
      result.current.removeRecord("temp-del");
    });

    expect(result.current.records.some((r) => r.id === "temp-del")).toBe(false);
  });

  it("마지막 레코드 제거 후 viewState가 'empty'가 된다", async () => {
    mockFetch({ "/api/v1/counseling-records": { records: [] } });

    const { result } = renderHook(() => useRecords(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.viewState.kind).not.toBe("loading"),
    );

    const tempRec = makeTempRecord({ id: "temp-last" });
    act(() => {
      result.current.addProcessingRecord(tempRec);
    });
    act(() => {
      result.current.removeRecord("temp-last");
    });

    expect(result.current.viewState.kind).toBe("empty");
  });
});
