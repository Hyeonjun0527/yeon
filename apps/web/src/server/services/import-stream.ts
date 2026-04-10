import type { ImportPreview, RefineContext } from "./file-analysis-service";
import { analyzeBuffer } from "./file-analysis-service";
import { ServiceError } from "./service-error";
import type { FileKind } from "@/lib/file-kind";

const ANALYSIS_STEPS = [
  "파일 내용을 읽고 있습니다...",
  "데이터 구조를 파악하고 있습니다...",
  "수강생 목록을 추출하고 있습니다...",
  "이름, 이메일, 연락처를 정리하고 있습니다...",
  "코호트별로 분류하고 있습니다...",
  "결과를 검토하고 있습니다...",
];

const REFINE_STEPS = [
  "요청을 분석하고 있습니다...",
  "기존 데이터에 변경사항을 적용하고 있습니다...",
  "수정된 결과를 검토하고 있습니다...",
  "최종 결과를 확인하고 있습니다...",
];

export type ImportSSEEvent =
  | { type: "progress"; text: string }
  | { type: "done"; preview: ImportPreview }
  | { type: "error"; message: string };

export function createImportSSEStream(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  kind: FileKind,
  refine?: RefineContext,
): Response {
  const encoder = new TextEncoder();
  const steps = refine ? REFINE_STEPS : ANALYSIS_STEPS;
  let stepIdx = 0;
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: ImportSSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      const startTime = Date.now();

      // 첫 메시지 즉시 전송
      send({ type: "progress", text: steps[stepIdx++]! });

      // 2.2초마다 다음 단계 메시지, 단계 소진 후에는 경과 시간 표시
      intervalHandle = setInterval(() => {
        if (stepIdx < steps.length) {
          send({ type: "progress", text: steps[stepIdx++]! });
        } else {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          send({ type: "progress", text: `대용량 파일을 분석하고 있습니다... (${elapsed}초 경과)` });
        }
      }, 2200);

      // AI 분석 병렬 실행
      analyzeBuffer(buffer, fileName, mimeType, kind, refine)
        .then((preview) => {
          if (cancelled) return;
          if (intervalHandle) clearInterval(intervalHandle);
          send({ type: "done", preview });
          controller.close();
        })
        .catch((err) => {
          if (cancelled) return;
          if (intervalHandle) clearInterval(intervalHandle);
          const message =
            err instanceof ServiceError ? err.message : "분석에 실패했습니다.";
          send({ type: "error", message });
          controller.close();
        });
    },
    cancel() {
      cancelled = true;
      if (intervalHandle) clearInterval(intervalHandle);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
