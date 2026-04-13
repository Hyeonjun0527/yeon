import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("../file-analysis-service", () => ({
  analyzeBuffer: vi.fn(async () => ({
    preview: { cohorts: [] },
    assistantMessage: "답변",
  })),
}));

import { createImportSSEStream } from "../import-stream";

async function readStreamText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  return text;
}

describe("createImportSSEStream", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("draft 저장이 끝난 뒤에만 done 이벤트를 보낸다", async () => {
    const callOrder: string[] = [];

    const response = createImportSSEStream(
      Buffer.from("name,email\n홍길동,hong@example.com"),
      "students.csv",
      "text/csv",
      "csv",
      undefined,
      undefined,
      {
        onDone: async () => {
          callOrder.push("onDone:start");
          await Promise.resolve();
          callOrder.push("onDone:end");
        },
      },
    );

    const text = await readStreamText(response);
    callOrder.push(text.includes('"type":"done"') ? "done:event" : "missing");

    expect(callOrder).toEqual(["onDone:start", "onDone:end", "done:event"]);
  });
});
