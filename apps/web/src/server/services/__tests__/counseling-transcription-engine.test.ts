import { describe, it, expect } from "vitest";
import { _testing } from "../counseling-transcription-engine";

const {
  mapSpeakerTone,
  formatSpeakerLabel,
  splitTranscriptIntoParagraphs,
  buildFallbackSegments,
  mapOpenAiSegments,
} = _testing;

describe("mapSpeakerTone", () => {
  it("teacher 계열 레이블을 teacher로 매핑", () => {
    expect(mapSpeakerTone("Teacher")).toBe("teacher");
    expect(mapSpeakerTone("교사")).toBe("teacher");
    expect(mapSpeakerTone("강사")).toBe("teacher");
    expect(mapSpeakerTone("멘토")).toBe("teacher");
  });

  it("student 계열 레이블을 student로 매핑", () => {
    expect(mapSpeakerTone("Student")).toBe("student");
    expect(mapSpeakerTone("학생")).toBe("student");
    expect(mapSpeakerTone("수강생")).toBe("student");
  });

  it("보호자/guardian/parent 계열은 부트캠프 맥락에서 unknown으로 매핑", () => {
    expect(mapSpeakerTone("Guardian")).toBe("unknown");
    expect(mapSpeakerTone("보호자")).toBe("unknown");
    expect(mapSpeakerTone("Parent")).toBe("unknown");
  });

  it("알 수 없는 레이블은 unknown", () => {
    expect(mapSpeakerTone("speaker_0")).toBe("unknown");
    expect(mapSpeakerTone("A")).toBe("unknown");
    expect(mapSpeakerTone(null)).toBe("unknown");
    expect(mapSpeakerTone(undefined)).toBe("unknown");
  });
});

describe("formatSpeakerLabel", () => {
  it("null/undefined/빈값은 원문으로 변환", () => {
    expect(formatSpeakerLabel(null)).toBe("원문");
    expect(formatSpeakerLabel(undefined)).toBe("원문");
    expect(formatSpeakerLabel("")).toBe("원문");
    expect(formatSpeakerLabel("  ")).toBe("원문");
  });

  it("speaker_N 형식을 화자 N+1로 변환", () => {
    expect(formatSpeakerLabel("speaker_0")).toBe("화자 1");
    expect(formatSpeakerLabel("speaker_1")).toBe("화자 2");
    expect(formatSpeakerLabel("Speaker 0")).toBe("화자 1");
  });

  it("단일 대문자는 화자 X로 변환", () => {
    expect(formatSpeakerLabel("A")).toBe("화자 A");
    expect(formatSpeakerLabel("B")).toBe("화자 B");
  });

  it("일반 레이블은 그대로 반환 (최대 40자)", () => {
    expect(formatSpeakerLabel("agent")).toBe("agent");
    expect(formatSpeakerLabel("민수")).toBe("민수");
    const long = "a".repeat(50);
    expect(formatSpeakerLabel(long)).toBe("a".repeat(40));
  });
});

describe("splitTranscriptIntoParagraphs", () => {
  it("줄바꿈으로 분할", () => {
    const result = splitTranscriptIntoParagraphs("첫째 문장\n둘째 문장\n셋째 문장");
    expect(result).toEqual(["첫째 문장", "둘째 문장", "셋째 문장"]);
  });

  it("줄바꿈이 없고 문장부호 뒤 공백이 없으면 단일 문단", () => {
    const result = splitTranscriptIntoParagraphs("첫째 문장. 둘째 문장! 셋째 문장?");
    expect(result).toEqual(["첫째 문장. 둘째 문장! 셋째 문장?"]);
  });

  it("문장부호 뒤 공백이 있으면 분할", () => {
    const result = splitTranscriptIntoParagraphs("첫째. 둘째! 셋째?");
    // 줄바꿈이 없으므로 compact가 단일 요소 → 문장부호 분할 미적용 (compact.length > 0)
    expect(result).toEqual(["첫째. 둘째! 셋째?"]);
  });

  it("빈 줄 제거", () => {
    const result = splitTranscriptIntoParagraphs("첫째\n\n\n둘째");
    expect(result).toEqual(["첫째", "둘째"]);
  });
});

describe("buildFallbackSegments", () => {
  it("문단 기반으로 세그먼트 생성, speakerLabel은 원문", () => {
    const result = buildFallbackSegments("안녕하세요.\n반갑습니다.", 4000, 0, 0);
    expect(result).toHaveLength(2);
    expect(result[0].speakerLabel).toBe("원문");
    expect(result[0].speakerTone).toBe("unknown");
    expect(result[0].text).toBe("안녕하세요.");
    expect(result[1].text).toBe("반갑습니다.");
  });

  it("시간을 균등 분배", () => {
    const result = buildFallbackSegments("A\nB\nC", 6000, 0, 0);
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(2000);
    expect(result[1].startMs).toBe(2000);
    expect(result[1].endMs).toBe(4000);
    expect(result[2].startMs).toBe(4000);
    expect(result[2].endMs).toBe(6000);
  });

  it("offsetMs를 반영", () => {
    const result = buildFallbackSegments("A\nB", 4000, 10000, 0);
    expect(result[0].startMs).toBe(10000);
    expect(result[1].startMs).toBe(12000);
  });

  it("durationMs가 null이면 시간 정보 없음", () => {
    const result = buildFallbackSegments("A\nB", null, 0, 0);
    expect(result[0].startMs).toBeNull();
    expect(result[0].endMs).toBeNull();
  });

  it("startingSegmentIndex를 반영", () => {
    const result = buildFallbackSegments("A\nB", 4000, 0, 5);
    expect(result[0].segmentIndex).toBe(5);
    expect(result[1].segmentIndex).toBe(6);
  });
});

describe("mapOpenAiSegments", () => {
  it("diarization 응답에서 speaker 기반 세그먼트 생성", () => {
    const segments = [
      { start: 0.0, end: 4.7, text: "안녕하세요.", speaker: "agent" },
      { start: 4.7, end: 11.8, text: "네 반갑습니다.", speaker: "A" },
    ];

    const result = mapOpenAiSegments("전체 텍스트", 12000, segments, 0, 0);
    expect(result).toHaveLength(2);
    expect(result[0].speakerLabel).toBe("agent");
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(4700);
    expect(result[1].speakerLabel).toBe("화자 A");
    expect(result[1].startMs).toBe(4700);
  });

  it("speaker_label 우선, speaker fallback", () => {
    const segments = [
      { start: 0, end: 3, text: "테스트", speaker_label: "Teacher", speaker: "speaker_0" },
    ];

    const result = mapOpenAiSegments("테스트", 3000, segments, 0, 0);
    expect(result[0].speakerLabel).toBe("Teacher");
    expect(result[0].speakerTone).toBe("teacher");
  });

  it("speaker 필드만 있을 때도 동작", () => {
    const segments = [
      { start: 0, end: 3, text: "테스트", speaker: "학생" },
    ];

    const result = mapOpenAiSegments("테스트", 3000, segments, 0, 0);
    expect(result[0].speakerTone).toBe("student");
  });

  it("segments가 비어있으면 fallback으로 전환", () => {
    const result = mapOpenAiSegments("문장 하나.", 5000, [], 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].speakerLabel).toBe("원문");
  });

  it("segments가 undefined이면 fallback으로 전환", () => {
    const result = mapOpenAiSegments("문장 하나.\n문장 둘.", 6000, undefined, 0, 0);
    expect(result).toHaveLength(2);
    expect(result[0].speakerLabel).toBe("원문");
  });

  it("offsetMs를 세그먼트 시간에 반영", () => {
    const segments = [
      { start: 0, end: 3, text: "테스트", speaker: "A" },
    ];

    const result = mapOpenAiSegments("테스트", 3000, segments, 30000, 0);
    expect(result[0].startMs).toBe(30000);
    expect(result[0].endMs).toBe(33000);
  });

  it("빈 텍스트 세그먼트는 무시", () => {
    const segments = [
      { start: 0, end: 2, text: "유효", speaker: "A" },
      { start: 2, end: 4, text: "", speaker: "B" },
      { start: 4, end: 6, text: "유효2", speaker: "A" },
    ];

    const result = mapOpenAiSegments("유효 유효2", 6000, segments, 0, 0);
    expect(result).toHaveLength(2);
  });
});
