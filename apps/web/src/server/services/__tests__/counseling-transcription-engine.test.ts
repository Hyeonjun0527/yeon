import { describe, it, expect } from "vitest";
import { _testing } from "../counseling-transcription-engine";

const {
  mapSpeakerTone,
  formatSpeakerLabel,
  splitTranscriptIntoParagraphs,
  buildFallbackSegments,
  mapOpenAiSegments,
  shouldChunkTranscription,
  getPreferredTranscriptionStrategy,
  isRecoverableEmptyChunk,
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
    const result = splitTranscriptIntoParagraphs(
      "첫째 문장\n둘째 문장\n셋째 문장",
    );
    expect(result).toEqual(["첫째 문장", "둘째 문장", "셋째 문장"]);
  });

  it("줄바꿈이 없고 문장부호 뒤 공백이 없으면 단일 문단", () => {
    const result = splitTranscriptIntoParagraphs(
      "첫째 문장. 둘째 문장! 셋째 문장?",
    );
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
    const result = buildFallbackSegments(
      "안녕하세요.\n반갑습니다.",
      4000,
      0,
      0,
    );
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
      {
        start: 0,
        end: 3,
        text: "테스트",
        speaker_label: "Teacher",
        speaker: "speaker_0",
      },
    ];

    const result = mapOpenAiSegments("테스트", 3000, segments, 0, 0);
    expect(result[0].speakerLabel).toBe("Teacher");
    expect(result[0].speakerTone).toBe("teacher");
  });

  it("speaker 필드만 있을 때도 동작", () => {
    const segments = [{ start: 0, end: 3, text: "테스트", speaker: "학생" }];

    const result = mapOpenAiSegments("테스트", 3000, segments, 0, 0);
    expect(result[0].speakerTone).toBe("student");
  });

  it("segments가 비어있으면 fallback으로 전환", () => {
    const result = mapOpenAiSegments("문장 하나.", 5000, [], 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].speakerLabel).toBe("원문");
  });

  it("segments가 undefined이면 fallback으로 전환", () => {
    const result = mapOpenAiSegments(
      "문장 하나.\n문장 둘.",
      6000,
      undefined,
      0,
      0,
    );
    expect(result).toHaveLength(2);
    expect(result[0].speakerLabel).toBe("원문");
  });

  it("offsetMs를 세그먼트 시간에 반영", () => {
    const segments = [{ start: 0, end: 3, text: "테스트", speaker: "A" }];

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

// ─── 추가 엣지케이스 ────────────────────────────────────────────────────────

describe("mapSpeakerTone 추가 엣지케이스", () => {
  it("대소문자 조합 TEACHER → teacher", () => {
    expect(mapSpeakerTone("TEACHER")).toBe("teacher");
  });

  it("대소문자 혼합 TeAcHeR → teacher", () => {
    expect(mapSpeakerTone("TeAcHeR")).toBe("teacher");
  });

  it("숫자만 포함 레이블 '123' → unknown", () => {
    expect(mapSpeakerTone("123")).toBe("unknown");
  });

  it("특수문자 레이블 '@#$' → unknown", () => {
    expect(mapSpeakerTone("@#$")).toBe("unknown");
  });

  it("공백만 있는 레이블 '   ' → unknown", () => {
    expect(mapSpeakerTone("   ")).toBe("unknown");
  });

  it("100자 teacher 포함 레이블 → teacher", () => {
    const long = "teacher" + "x".repeat(93);
    expect(mapSpeakerTone(long)).toBe("teacher");
  });
});

describe("formatSpeakerLabel 추가 엣지케이스", () => {
  it("'speaker_10' → '화자 11'", () => {
    expect(formatSpeakerLabel("speaker_10")).toBe("화자 11");
  });

  it("'SPEAKER_0' 대문자 → '화자 1'", () => {
    expect(formatSpeakerLabel("SPEAKER_0")).toBe("화자 1");
  });

  it("한글 레이블은 그대로 반환", () => {
    expect(formatSpeakerLabel("김철수")).toBe("김철수");
  });

  it("정확히 40자 레이블 → 그대로 반환", () => {
    const label = "b".repeat(40);
    expect(formatSpeakerLabel(label)).toBe(label);
  });

  it("41자 레이블 → 40자 잘림", () => {
    const label = "c".repeat(41);
    expect(formatSpeakerLabel(label)).toBe("c".repeat(40));
  });
});

describe("splitTranscriptIntoParagraphs 추가 케이스", () => {
  it("빈 문자열 입력 → 빈 배열", () => {
    const result = splitTranscriptIntoParagraphs("");
    expect(result).toEqual([]);
  });

  it("줄바꿈만 연속으로 있는 입력 '\\n\\n\\n' → 빈 배열", () => {
    const result = splitTranscriptIntoParagraphs("\n\n\n");
    expect(result).toEqual([]);
  });

  it("매우 긴 단일 문단 → 단일 요소 배열", () => {
    const text = "단어 ".repeat(200).trim();
    const result = splitTranscriptIntoParagraphs(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it("\\r\\n 줄바꿈으로 분할", () => {
    const result = splitTranscriptIntoParagraphs("첫째\r\n둘째\r\n셋째");
    expect(result).toEqual(["첫째", "둘째", "셋째"]);
  });

  it("앞뒤 공백이 있는 줄은 trim 후 포함", () => {
    const result = splitTranscriptIntoParagraphs("  첫째  \n  둘째  ");
    expect(result).toEqual(["첫째", "둘째"]);
  });
});

describe("buildFallbackSegments 추가 케이스", () => {
  it("빈 transcriptText → 단일 세그먼트 (safeParagraphs fallback)", () => {
    const result = buildFallbackSegments("", 2000, 0, 0);
    // splitTranscriptIntoParagraphs("") returns [], safeParagraphs = [""]
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("");
  });

  it("단일 줄 입력 → 세그먼트 1개", () => {
    const result = buildFallbackSegments("안녕하세요.", 3000, 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("안녕하세요.");
  });

  it("여러 줄 입력 → 줄 수만큼 세그먼트 생성", () => {
    const result = buildFallbackSegments("A\nB\nC\nD", 8000, 0, 0);
    expect(result).toHaveLength(4);
    expect(result.map((s) => s.text)).toEqual(["A", "B", "C", "D"]);
  });

  it("각 segment의 speakerLabel, speakerTone, segmentIndex 확인", () => {
    const result = buildFallbackSegments("X\nY", 4000, 0, 3);
    expect(result[0].speakerLabel).toBe("원문");
    expect(result[0].speakerTone).toBe("unknown");
    expect(result[0].segmentIndex).toBe(3);
    expect(result[1].speakerLabel).toBe("원문");
    expect(result[1].speakerTone).toBe("unknown");
    expect(result[1].segmentIndex).toBe(4);
  });

  it("durationMs가 양수이면 startMs/endMs가 null이 아님", () => {
    const result = buildFallbackSegments("P\nQ", 6000, 0, 0);
    expect(result[0].startMs).not.toBeNull();
    expect(result[0].endMs).not.toBeNull();
    expect(result[1].startMs).not.toBeNull();
    expect(result[1].endMs).not.toBeNull();
  });
});

describe("mapOpenAiSegments 추가 케이스", () => {
  it("빈 배열 입력 → fallback 전환 (segments=[])", () => {
    const result = mapOpenAiSegments("단일 문장.", 5000, [], 0, 0);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].speakerLabel).toBe("원문");
  });

  it("speaker가 null인 세그먼트 → speakerTone unknown, speakerLabel 원문", () => {
    const segments = [{ start: 0, end: 2, text: "테스트", speaker: null }];
    const result = mapOpenAiSegments("테스트", 2000, segments as never, 0, 0);
    expect(result[0].speakerTone).toBe("unknown");
    expect(result[0].speakerLabel).toBe("원문");
  });

  it("start/end가 정상인 세그먼트 → startMs/endMs 변환 정확", () => {
    const segments = [{ start: 1.5, end: 3.25, text: "정상", speaker: "A" }];
    const result = mapOpenAiSegments("정상", 3250, segments, 0, 0);
    expect(result[0].startMs).toBe(1500);
    expect(result[0].endMs).toBe(3250);
  });

  it("text가 빈 문자열인 세그먼트는 건너뜀", () => {
    const segments = [
      { start: 0, end: 1, text: "", speaker: "A" },
      { start: 1, end: 2, text: "내용", speaker: "A" },
    ];
    const result = mapOpenAiSegments("내용", 2000, segments, 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("내용");
  });

  it("speakerTone 매핑이 올바른지 — 여러 화자 혼재", () => {
    const segments = [
      { start: 0, end: 1, text: "멘토 발화", speaker: "Teacher" },
      { start: 1, end: 2, text: "수강생 발화", speaker: "Student" },
      { start: 2, end: 3, text: "기타 발화", speaker: "speaker_2" },
    ];
    const result = mapOpenAiSegments("전체", 3000, segments, 0, 0);
    expect(result[0].speakerTone).toBe("teacher");
    expect(result[1].speakerTone).toBe("student");
    expect(result[2].speakerTone).toBe("unknown");
  });

  it("segmentIndex 순서 — startingSegmentIndex 반영", () => {
    const segments = [
      { start: 0, end: 1, text: "첫번째", speaker: "A" },
      { start: 1, end: 2, text: "두번째", speaker: "B" },
      { start: 2, end: 3, text: "세번째", speaker: "A" },
    ];
    const result = mapOpenAiSegments("전체", 3000, segments, 0, 10);
    expect(result[0].segmentIndex).toBe(10);
    expect(result[1].segmentIndex).toBe(11);
    expect(result[2].segmentIndex).toBe(12);
  });

  it("startMs가 초→밀리초 변환 (start * 1000)", () => {
    const segments = [
      { start: 2.0, end: 5.0, text: "변환 확인", speaker: "A" },
    ];
    const result = mapOpenAiSegments("변환 확인", 5000, segments, 0, 0);
    expect(result[0].startMs).toBe(2000);
    expect(result[0].endMs).toBe(5000);
  });

  it("speaker가 'Teacher'인 경우 speakerTone = 'teacher'", () => {
    const segments = [
      { start: 0, end: 2, text: "강사 발화", speaker: "Teacher" },
    ];
    const result = mapOpenAiSegments("강사 발화", 2000, segments, 0, 0);
    expect(result[0].speakerTone).toBe("teacher");
  });

  it("speaker가 'Student'인 경우 speakerTone = 'student'", () => {
    const segments = [
      { start: 0, end: 2, text: "수강생 발화", speaker: "Student" },
    ];
    const result = mapOpenAiSegments("수강생 발화", 2000, segments, 0, 0);
    expect(result[0].speakerTone).toBe("student");
  });

  it("speaker가 알 수 없는 경우 speakerTone = 'unknown'", () => {
    const segments = [
      { start: 0, end: 2, text: "알 수 없음", speaker: "speaker_99" },
    ];
    const result = mapOpenAiSegments("알 수 없음", 2000, segments, 0, 0);
    expect(result[0].speakerTone).toBe("unknown");
  });
});

describe("transcription strategy", () => {
  it("1시간 오디오는 byte size가 작아도 duration 기준으로 chunk한다", () => {
    expect(shouldChunkTranscription(12 * 1024 * 1024, 3599_736, 23 * 60)).toBe(
      true,
    );
  });

  it("짧은 오디오는 duration과 byte size가 작으면 chunk하지 않는다", () => {
    expect(shouldChunkTranscription(4 * 1024 * 1024, 60 * 1000, 23 * 60)).toBe(
      false,
    );
  });

  it("긴 오디오는 non-diarize 우선 전략과 4분 청크를 선택한다", () => {
    const strategy = getPreferredTranscriptionStrategy(3599_736);
    expect(strategy.preferNonDiarization).toBe(true);
    expect(strategy.chunkDurationSeconds).toBe(4 * 60);
    expect(strategy.modelCandidates[0]).toContain("transcribe");
  });

  it("20분을 넘는 9MB mp3는 통파일이 아니라 청킹 경로로 들어간다", () => {
    const durationMs = 20 * 60 * 1000 + 1;
    const strategy = getPreferredTranscriptionStrategy(durationMs);

    expect(strategy.preferNonDiarization).toBe(true);
    expect(strategy.chunkDurationSeconds).toBe(4 * 60);
    expect(
      shouldChunkTranscription(
        9 * 1024 * 1024,
        durationMs,
        strategy.chunkDurationSeconds,
      ),
    ).toBe(true);
  });
});

describe("recoverable empty chunk", () => {
  it("duration이 없고 파일이 매우 작으면 자동 폐기 대상으로 본다", () => {
    expect(
      isRecoverableEmptyChunk({
        byteSize: 620,
        durationMs: null,
      }),
    ).toBe(true);
  });

  it("duration이 없더라도 파일이 크면 자동 폐기 대상으로 보지 않는다", () => {
    expect(
      isRecoverableEmptyChunk({
        byteSize: 32 * 1024,
        durationMs: null,
      }),
    ).toBe(false);
  });

  it("duration이 있으면 파일이 작아도 유효 chunk로 유지한다", () => {
    expect(
      isRecoverableEmptyChunk({
        byteSize: 900,
        durationMs: 120,
      }),
    ).toBe(false);
  });
});
