import { describe, expect, it } from "vitest";

import {
  buildTranscriptDisplayBlocks,
  normalizeCounselingTranscriptSegments,
} from "../counseling-transcript-display";

describe("normalizeCounselingTranscriptSegments", () => {
  it("segmentIndex 순서대로 정렬하고 빈 텍스트는 제거한다", () => {
    const normalized = normalizeCounselingTranscriptSegments([
      {
        id: "segment-2",
        segmentIndex: 2,
        startMs: 2_000,
        endMs: 3_000,
        speakerLabel: "멘토",
        speakerTone: "teacher",
        text: "두 번째",
      },
      {
        id: "segment-0",
        segmentIndex: 0,
        startMs: 0,
        endMs: 1_000,
        speakerLabel: "멘토",
        speakerTone: "teacher",
        text: "  ",
      },
      {
        id: "segment-1",
        segmentIndex: 1,
        startMs: 1_000,
        endMs: 2_000,
        speakerLabel: "멘토",
        speakerTone: "teacher",
        text: "첫 번째",
      },
    ]);

    expect(normalized.map((segment) => segment.id)).toEqual([
      "segment-1",
      "segment-2",
    ]);
  });
});

describe("buildTranscriptDisplayBlocks", () => {
  it("같은 화자의 연속 세그먼트를 하나의 화자 턴으로 묶는다", () => {
    const blocks = buildTranscriptDisplayBlocks([
      {
        id: "segment-1",
        segmentIndex: 0,
        startMs: 0,
        endMs: 2_000,
        speakerLabel: "멘토",
        speakerTone: "teacher",
        text: "안녕하세요. 오늘 어떤 점이 고민인가요?",
      },
      {
        id: "segment-2",
        segmentIndex: 1,
        startMs: 2_000,
        endMs: 4_000,
        speakerLabel: "멘토",
        speakerTone: "teacher",
        text: "편하게 말씀해 주세요.",
      },
      {
        id: "segment-3",
        segmentIndex: 2,
        startMs: 4_000,
        endMs: 6_000,
        speakerLabel: "수강생",
        speakerTone: "student",
        text: "취업 방향을 다시 고민하고 있습니다.",
      },
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({
      speakerLabel: "멘토",
      speakerTone: "teacher",
      segmentCount: 2,
      sourceSegmentIds: ["segment-1", "segment-2"],
      segments: [
        expect.objectContaining({ id: "segment-1" }),
        expect.objectContaining({ id: "segment-2" }),
      ],
      startMs: 0,
      endMs: 4_000,
    });
    expect(blocks[1]).toMatchObject({
      speakerLabel: "수강생",
      speakerTone: "student",
      segmentCount: 1,
      sourceSegmentIds: ["segment-3"],
    });
  });

  it("긴 화자 턴은 내부 readable chunk 여러 개로 분할한다", () => {
    const blocks = buildTranscriptDisplayBlocks([
      {
        id: "segment-1",
        segmentIndex: 0,
        startMs: 0,
        endMs: 4_000,
        speakerLabel: "멘토",
        speakerTone: "teacher",
        text: "안녕하세요. 오늘 어떤 점이 고민인지 먼저 말씀해 주세요. 지금 취업 준비에서 가장 막히는 부분이 무엇인지, 그리고 최근에 시도한 방식이 있었다면 같이 정리해 보면 좋겠습니다.",
      },
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].chunks.length).toBeGreaterThan(1);
    expect(blocks[0].chunks.every((chunk) => chunk.text.length > 0)).toBe(true);
    expect(blocks[0].chunks[0]?.sourceSegmentIds).toEqual(["segment-1"]);
  });
});
