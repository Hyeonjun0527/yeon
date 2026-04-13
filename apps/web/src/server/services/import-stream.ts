import type {
  FieldSchemaHint,
  ImportAnalysisResult,
  ImportPreview,
  RefineContext,
} from "./file-analysis-service";
import { analyzeBuffer } from "./file-analysis-service";
import { ServiceError } from "./service-error";
import {
  createImportAnalysisProgressState,
  type ImportAnalysisProgressState,
  type ImportAnalysisStage,
} from "@/lib/import-analysis-progress";
import type { FileKind } from "@/lib/file-kind";

export type ImportSSEEvent =
  | {
      type: "progress";
      text: string;
      stage: ImportAnalysisStage;
      progress: number;
    }
  | { type: "done"; preview: ImportPreview; assistantMessage?: string | null }
  | { type: "error"; message: string };

interface ImportSSEOptions {
  onDone?: (result: ImportAnalysisResult) => Promise<void> | void;
  onError?: (message: string) => Promise<void> | void;
  onProgress?: (progress: ImportAnalysisProgressState) => Promise<void> | void;
  extraHeaders?: Record<string, string>;
}

export function createImportSSEStream(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  kind: FileKind,
  refine?: RefineContext,
  fieldHints?: FieldSchemaHint[],
  options?: ImportSSEOptions,
): Response {
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: ImportSSEEvent) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      }

      const reportProgress = async (progress: ImportAnalysisProgressState) => {
        await Promise.resolve(options?.onProgress?.(progress));
        if (cancelled) return;
        send({
          type: "progress",
          text: progress.message,
          stage: progress.stage,
          progress: progress.progress,
        });
      };

      try {
        await reportProgress(createImportAnalysisProgressState("queued"));
        const result = await analyzeBuffer(
          buffer,
          fileName,
          mimeType,
          kind,
          refine,
          fieldHints,
          reportProgress,
        );
        await Promise.resolve(options?.onDone?.(result));
        if (cancelled) return;
        send({
          type: "done",
          preview: result.preview,
          assistantMessage: result.assistantMessage ?? null,
        });
        controller.close();
      } catch (err) {
        const message =
          err instanceof ServiceError ? err.message : "분석에 실패했습니다.";
        await Promise.resolve(options?.onError?.(message)).catch(() => {});
        if (cancelled) return;
        send({ type: "error", message });
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...(options?.extraHeaders ?? {}),
    },
  });
}
