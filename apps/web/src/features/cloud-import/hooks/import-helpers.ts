import type { ImportPreview } from "../types";

/* ── Message ID ── */

export function nextId(): string {
  return crypto.randomUUID();
}

/* ── Preview text helpers ── */

export function summaryText(preview: ImportPreview): string {
  const total = preview.cohorts.reduce((s, c) => s + c.students.length, 0);
  return `${preview.cohorts.length}개 스페이스, ${total}명 수강생`;
}

export function diffText(prev: ImportPreview, next: ImportPreview): string {
  const prevTotal = prev.cohorts.reduce((s, c) => s + c.students.length, 0);
  const nextTotal = next.cohorts.reduce((s, c) => s + c.students.length, 0);
  const studentDiff = nextTotal - prevTotal;
  const cohortDiff = next.cohorts.length - prev.cohorts.length;

  const parts: string[] = [];
  if (cohortDiff > 0) parts.push(`스페이스 ${cohortDiff}개 추가`);
  else if (cohortDiff < 0) parts.push(`스페이스 ${Math.abs(cohortDiff)}개 제거`);
  if (studentDiff > 0) parts.push(`수강생 ${studentDiff}명 추가`);
  else if (studentDiff < 0) parts.push(`수강생 ${Math.abs(studentDiff)}명 제거`);

  const base = `현재 ${summaryText(next)}`;
  if (parts.length === 0) return `완료! 데이터를 업데이트했습니다. (${base})`;
  return `완료! ${parts.join(", ")}했습니다. (${base})`;
}

/* ── SSE stream reader ── */

export async function readImportSSE(
  res: Response,
  onProgress: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ preview?: ImportPreview; error?: string }> {
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
            preview?: ImportPreview;
            message?: string;
          };
          if (event.type === "progress" && event.text) onProgress(event.text);
          if (event.type === "done" && event.preview) return { preview: event.preview };
          if (event.type === "error") return { error: event.message ?? "분석에 실패했습니다." };
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
