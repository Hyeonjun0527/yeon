import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyzeCounselingRecord,
  resolveSpeakerNames,
  streamCounselingAiChat,
  streamWebSearchAiChat,
} from "../counseling-ai-service";

function createStream(chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });
}

async function collectSseContent(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      const parsed = JSON.parse(payload) as { content?: string };
      content += parsed.content ?? "";
    }
  }

  return content;
}

describe("counseling-ai-service", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_WEB_SEARCH_MODEL = "gpt-5.4-mini";
    process.env.OPENAI_AI_CHAT_MODEL = "gpt-4.1-mini";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
  });

  it("resolveSpeakerNames는 이미 의미 있는 화자명이면 AI 호출 없이 스킵한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      resolveSpeakerNames([
        { speakerLabel: "멘토", text: "안녕하세요", startMs: 0 },
      ]),
    ).resolves.toEqual({ mapping: {}, studentName: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolveSpeakerNames는 파싱 불가 응답이면 빈 결과로 fallback한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ choices: [{ message: { content: "not-json" } }] }),
            { status: 200 },
          ),
        ),
    );

    await expect(
      resolveSpeakerNames([
        { speakerLabel: "화자 A", text: "안녕하세요", startMs: 0 },
      ]),
    ).resolves.toEqual({ mapping: {}, studentName: null });
  });

  it("analyzeCounselingRecord는 OPENAI_API_KEY가 없으면 실패한다", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(
      analyzeCounselingRecord(
        {
          studentName: "홍길동",
          sessionTitle: "1차 상담",
          counselingType: "대면 상담",
          createdAt: "2026-04-12T10:00:00.000Z",
        },
        [{ speakerLabel: "멘토", text: "안녕하세요", startMs: 0 }],
      ),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("analyzeCounselingRecord는 invalid JSON 응답이면 502를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ choices: [{ message: { content: "not-json" } }] }),
            { status: 200 },
          ),
        ),
    );

    await expect(
      analyzeCounselingRecord(
        {
          studentName: "홍길동",
          sessionTitle: "1차 상담",
          counselingType: "대면 상담",
          createdAt: "2026-04-12T10:00:00.000Z",
        },
        [{ speakerLabel: "멘토", text: "안녕하세요", startMs: 0 }],
      ),
    ).rejects.toMatchObject({
      status: 502,
      message: "AI 분석 응답 JSON 파싱 실패",
    });
  });

  it("streamCounselingAiChat는 response.body가 없으면 502를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue({ ok: true, body: null } as Response),
    );

    await expect(
      streamCounselingAiChat(
        {
          studentName: "홍길동",
          sessionTitle: "1차 상담",
          counselingType: "대면 상담",
          createdAt: "2026-04-12T10:00:00.000Z",
        },
        [{ speakerLabel: "멘토", text: "안녕하세요", startMs: 0 }],
        [{ role: "user", content: "요약해줘" }],
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("웹검색 응답에서 출처 링크를 붙여 SSE로 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                type: "web_search_call",
                id: "ws_1",
                status: "completed",
              },
              {
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text: "최신 소식입니다.",
                    annotations: [
                      {
                        type: "url_citation",
                        url: "https://example.com/news",
                        title: "예시 뉴스",
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const stream = await streamWebSearchAiChat([
      { role: "user", content: "최신 소식 알려줘" },
    ]);
    const content = await collectSseContent(stream);

    expect(content).toContain("최신 소식입니다.");
    expect(content).toContain("**출처**");
    expect(content).toContain("[예시 뉴스](https://example.com/news)");
  });

  it("웹검색 응답에 출처가 없으면 일반 AI 스트림으로 fallback한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              output: [
                {
                  type: "web_search_call",
                  id: "ws_1",
                  status: "completed",
                },
                {
                  type: "message",
                  role: "assistant",
                  content: [
                    {
                      type: "output_text",
                      text: "출처 없는 검색 답변",
                      annotations: [],
                    },
                  ],
                },
              ],
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            createStream([
              'data: {"choices":[{"delta":{"content":"일반 AI fallback 답변"}}]}\n\n',
              "data: [DONE]\n\n",
            ]),
            { status: 200 },
          ),
        ),
    );

    const stream = await streamWebSearchAiChat([
      { role: "user", content: "이 질문은 fallback이 필요해" },
    ]);
    const content = await collectSseContent(stream);

    expect(content).toBe("일반 AI fallback 답변");
  });
});
