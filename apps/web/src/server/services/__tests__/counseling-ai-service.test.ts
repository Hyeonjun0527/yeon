import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyzeCounselingRecord,
  resolveSpeakerNames,
  streamCounselingAiChat,
} from "../counseling-ai-service";

describe("counseling-ai-service", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
  });

  afterEach(() => {
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
});
