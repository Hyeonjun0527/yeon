import type { ImportAnalysisStage } from "@/lib/import-analysis-progress";
import type { ImportAnalysisResponse, ImportPreview } from "../types";

export type RecoverableImportDraftStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "edited"
  | "imported"
  | "error";

export function getDraftRecoveryNotice(
  status: RecoverableImportDraftStatus,
): string | null {
  if (status === "analyzing") {
    return "분석 중이던 작업을 복구했습니다. 완료되면 결과가 이어집니다.";
  }

  if (status === "edited") {
    return "수정 중이던 가져오기 초안을 복구했습니다.";
  }

  if (status === "analyzed") {
    return "분석 결과를 복구했습니다. 이어서 검토하고 가져오세요.";
  }

  return null;
}

export function getQueuedAnalysisState() {
  return {
    stage: "queued" as const,
    progress: 0,
    message: "분석 대기 중입니다.",
  };
}

export function getCompletedAnalysisState() {
  return {
    stage: "preview_ready" as const,
    progress: 100,
    message: "분석이 완료되었습니다.",
  };
}

/* ── Message ID ── */

export function nextId(): string {
  return crypto.randomUUID();
}

/* ── Preview text helpers ── */

export function summaryText(preview: ImportPreview): string {
  const total = preview.cohorts.reduce((s, c) => s + c.students.length, 0);
  return `${preview.cohorts.length}개 스페이스, ${total}명 수강생`;
}

function previewFingerprint(preview: ImportPreview): string {
  return JSON.stringify(
    preview.cohorts.map((cohort) => ({
      name: cohort.name,
      startDate: cohort.startDate ?? null,
      endDate: cohort.endDate ?? null,
      students: cohort.students.map((student) => ({
        name: student.name,
        email: student.email ?? null,
        phone: student.phone ?? null,
        status: student.status ?? null,
        customFields: Object.fromEntries(
          Object.entries(student.customFields ?? {}).sort(([a], [b]) =>
            a.localeCompare(b, "ko"),
          ),
        ),
      })),
    })),
  );
}

export function diffText(prev: ImportPreview, next: ImportPreview): string {
  const prevTotal = prev.cohorts.reduce((s, c) => s + c.students.length, 0);
  const nextTotal = next.cohorts.reduce((s, c) => s + c.students.length, 0);
  const studentDiff = nextTotal - prevTotal;
  const cohortDiff = next.cohorts.length - prev.cohorts.length;
  const changed = previewFingerprint(prev) !== previewFingerprint(next);

  const parts: string[] = [];
  if (cohortDiff > 0) parts.push(`스페이스 ${cohortDiff}개 추가`);
  else if (cohortDiff < 0)
    parts.push(`스페이스 ${Math.abs(cohortDiff)}개 제거`);
  if (studentDiff > 0) parts.push(`수강생 ${studentDiff}명 추가`);
  else if (studentDiff < 0)
    parts.push(`수강생 ${Math.abs(studentDiff)}명 제거`);

  const base = `현재 ${summaryText(next)}`;
  if (!changed) {
    return `요청을 검토했지만 반영된 변경을 찾지 못했습니다. 더 구체적으로 말씀해 주세요. (${base})`;
  }
  if (parts.length === 0)
    return `완료! 데이터 내용을 업데이트했습니다. (${base})`;
  return `완료! ${parts.join(", ")}했습니다. (${base})`;
}

/* ── SSE stream reader ── */

export async function readImportSSE(
  res: Response,
  onProgress: (event: {
    text: string;
    stage?: ImportAnalysisStage;
    progress?: number;
  }) => void,
  signal?: AbortSignal,
): Promise<{
  preview?: ImportPreview;
  assistantMessage?: string | null;
  error?: string;
}> {
  if (!res.body) return { error: "응답 스트림을 받지 못했습니다." };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        return { error: "취소됐습니다." };
      }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            stage?: ImportAnalysisStage;
            progress?: number;
            preview?: ImportPreview;
            assistantMessage?: string | null;
            message?: string;
          };
          if (event.type === "progress" && event.text) {
            onProgress({
              text: event.text,
              stage: event.stage,
              progress: event.progress,
            });
          }
          if (event.type === "done" && event.preview)
            return {
              preview: event.preview,
              assistantMessage: event.assistantMessage ?? null,
            };
          if (event.type === "error")
            return { error: event.message ?? "분석에 실패했습니다." };
        } catch {
          // JSON 파싱 실패 무시
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { error: "스트림이 예상치 않게 종료됐습니다." };
}

export async function runImportAnalysisRequest(params: {
  request: () => Promise<Response>;
  signal?: AbortSignal;
  fallbackErrorMessage: string;
  onDraftId?: (draftId: string) => void;
  onProgress: (event: {
    text: string;
    stage?: ImportAnalysisStage;
    progress?: number;
  }) => void;
}): Promise<ImportAnalysisResponse> {
  const res = await params.request();

  if (!res.ok) {
    const message = await res.text().catch(() => params.fallbackErrorMessage);
    throw new Error(message.trim() || params.fallbackErrorMessage);
  }

  const nextDraftId = res.headers.get("x-import-draft-id");
  if (nextDraftId) {
    params.onDraftId?.(nextDraftId);
  }

  const result = await readImportSSE(res, params.onProgress, params.signal);

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.preview) {
    throw new Error(params.fallbackErrorMessage);
  }

  return {
    preview: result.preview,
    assistantMessage: result.assistantMessage ?? null,
  } satisfies ImportAnalysisResponse;
}
