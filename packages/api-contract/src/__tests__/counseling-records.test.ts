import { describe, it, expect } from "vitest";
import {
  counselingRecordStatusSchema,
  counselingRecordSpeakerToneSchema,
  counselingTranscriptSegmentSchema,
  counselingChatMessageSchema,
  counselingRecordListItemSchema,
  analysisResultSchema,
  analysisIssueSchema,
  updateSegmentRequestSchema,
  bulkUpdateSpeakerRequestSchema,
  linkMemberRequestSchema,
} from "../counseling-records";

// ---------------------------------------------------------------------------
// 공통 픽스처
// ---------------------------------------------------------------------------

const validSegment = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  segmentIndex: 0,
  startMs: 0,
  endMs: 5000,
  speakerLabel: "멘토",
  speakerTone: "teacher" as const,
  text: "안녕하세요.",
};

const validListItem = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  spaceId: "550e8400-e29b-41d4-a716-446655440002",
  memberId: "550e8400-e29b-41d4-a716-446655440003",
  studentName: "홍길동",
  sessionTitle: "1차 멘토링",
  counselingType: "1:1",
  counselorName: "김멘토",
  status: "ready" as const,
  recordSource: "audio_upload" as const,
  preview: "오늘 진행 상황을 공유했습니다.",
  tags: ["진도", "피드백"],
  audioOriginalName: "recording.webm",
  audioMimeType: "audio/webm",
  audioByteSize: 1024000,
  audioDurationMs: 600000,
  transcriptSegmentCount: 10,
  transcriptTextLength: 500,
  processingStage: "completed" as const,
  processingProgress: 100,
  processingMessage: "원문과 분석이 준비되었습니다.",
  processingChunkCount: 1,
  processingChunkCompletedCount: 1,
  transcriptionAttemptCount: 1,
  analysisStatus: "ready" as const,
  analysisProgress: 100,
  analysisErrorMessage: null,
  analysisAttemptCount: 1,
  language: "ko",
  sttModel: "whisper-1",
  errorMessage: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T01:00:00.000Z",
  transcriptionCompletedAt: "2024-01-01T00:30:00.000Z",
  analysisCompletedAt: "2024-01-01T00:45:00.000Z",
};

const validAnalysisResult = {
  summary: "수강생의 프로젝트 진행 상황을 점검했습니다.",
  member: {
    name: "홍길동",
    traits: ["적극적", "질문이 많음"],
    emotion: "긍정적",
  },
  issues: [
    {
      title: "일정 지연",
      detail: "백엔드 API 구현이 2일 지연됨",
      timestamp: "00:05:30",
    },
  ],
  actions: {
    mentor: ["다음 세션 전까지 코드 리뷰 완료"],
    member: ["API 명세 작성"],
    nextSession: ["진행 상황 점검", "Q&A"],
  },
  keywords: ["API", "일정", "프로젝트"],
};

const validChatMessage = {
  id: "msg-1",
  role: "assistant" as const,
  content: "안녕하세요.",
  createdAt: "2024-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// counselingRecordStatusSchema
// ---------------------------------------------------------------------------

describe("counselingRecordStatusSchema", () => {
  it("processing 을 유효한 값으로 통과시킨다", () => {
    expect(counselingRecordStatusSchema.parse("processing")).toBe("processing");
  });

  it("ready 를 유효한 값으로 통과시킨다", () => {
    expect(counselingRecordStatusSchema.parse("ready")).toBe("ready");
  });

  it("error 를 유효한 값으로 통과시킨다", () => {
    expect(counselingRecordStatusSchema.parse("error")).toBe("error");
  });

  it("정의되지 않은 값은 실패한다", () => {
    expect(counselingRecordStatusSchema.safeParse("pending").success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// counselingRecordSpeakerToneSchema
// ---------------------------------------------------------------------------

describe("counselingRecordSpeakerToneSchema", () => {
  it("teacher 를 유효한 값으로 통과시킨다", () => {
    expect(counselingRecordSpeakerToneSchema.parse("teacher")).toBe("teacher");
  });

  it("student 를 유효한 값으로 통과시킨다", () => {
    expect(counselingRecordSpeakerToneSchema.parse("student")).toBe("student");
  });

  it("unknown 을 유효한 값으로 통과시킨다", () => {
    expect(counselingRecordSpeakerToneSchema.parse("unknown")).toBe("unknown");
  });

  it("정의되지 않은 값은 실패한다", () => {
    expect(counselingRecordSpeakerToneSchema.safeParse("admin").success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// counselingTranscriptSegmentSchema
// ---------------------------------------------------------------------------

describe("counselingTranscriptSegmentSchema", () => {
  it("정상 객체를 통과시킨다", () => {
    const result = counselingTranscriptSegmentSchema.safeParse(validSegment);
    expect(result.success).toBe(true);
  });

  it("id 가 UUID 형식이 아니면 실패한다", () => {
    const result = counselingTranscriptSegmentSchema.safeParse({
      ...validSegment,
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("segmentIndex 가 음수이면 실패한다", () => {
    const result = counselingTranscriptSegmentSchema.safeParse({
      ...validSegment,
      segmentIndex: -1,
    });
    expect(result.success).toBe(false);
  });

  it("startMs 가 null 이어도 통과한다", () => {
    const result = counselingTranscriptSegmentSchema.safeParse({
      ...validSegment,
      startMs: null,
    });
    expect(result.success).toBe(true);
  });

  it("speakerTone 에 잘못된 값이 있으면 실패한다", () => {
    const result = counselingTranscriptSegmentSchema.safeParse({
      ...validSegment,
      speakerTone: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("text 가 빈 문자열이어도 통과한다", () => {
    const result = counselingTranscriptSegmentSchema.safeParse({
      ...validSegment,
      text: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("counselingChatMessageSchema", () => {
  it("정상 데이터를 통과시킨다", () => {
    const result = counselingChatMessageSchema.safeParse(validChatMessage);
    expect(result.success).toBe(true);
  });

  it("assistant/user 외 role 값은 실패한다", () => {
    const result = counselingChatMessageSchema.safeParse({
      ...validChatMessage,
      role: "system",
    });
    expect(result.success).toBe(false);
  });

  it("createdAt 이 datetime 형식이 아니면 실패한다", () => {
    const result = counselingChatMessageSchema.safeParse({
      ...validChatMessage,
      createdAt: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// counselingRecordListItemSchema
// ---------------------------------------------------------------------------

describe("counselingRecordListItemSchema", () => {
  it("정상 데이터를 통과시킨다", () => {
    const result = counselingRecordListItemSchema.safeParse(validListItem);
    expect(result.success).toBe(true);
  });

  it("audioByteSize 가 음수이면 실패한다", () => {
    const result = counselingRecordListItemSchema.safeParse({
      ...validListItem,
      audioByteSize: -1,
    });
    expect(result.success).toBe(false);
  });

  it("audioDurationMs 가 null 이어도 통과한다", () => {
    const result = counselingRecordListItemSchema.safeParse({
      ...validListItem,
      audioDurationMs: null,
    });
    expect(result.success).toBe(true);
  });

  it("status 에 잘못된 값이 있으면 실패한다", () => {
    const result = counselingRecordListItemSchema.safeParse({
      ...validListItem,
      status: "unknown_status",
    });
    expect(result.success).toBe(false);
  });

  it("createdAt 이 datetime 형식이 아니면 실패한다", () => {
    const result = counselingRecordListItemSchema.safeParse({
      ...validListItem,
      createdAt: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("tags 가 빈 배열이어도 통과한다", () => {
    const result = counselingRecordListItemSchema.safeParse({
      ...validListItem,
      tags: [],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// analysisIssueSchema
// ---------------------------------------------------------------------------

describe("analysisIssueSchema", () => {
  it("정상 데이터를 통과시킨다", () => {
    const result = analysisIssueSchema.safeParse({
      title: "일정 지연",
      detail: "백엔드 API 구현이 2일 지연됨",
      timestamp: "00:05:30",
    });
    expect(result.success).toBe(true);
  });

  it("timestamp 가 null 이어도 통과한다", () => {
    const result = analysisIssueSchema.safeParse({
      title: "이슈",
      detail: "상세 내용",
      timestamp: null,
    });
    expect(result.success).toBe(true);
  });

  it("timestamp 필드가 없어도 통과한다 (optional)", () => {
    const result = analysisIssueSchema.safeParse({
      title: "이슈",
      detail: "상세 내용",
    });
    expect(result.success).toBe(true);
  });

  it("title 이 없으면 실패한다", () => {
    const result = analysisIssueSchema.safeParse({
      detail: "상세 내용",
      timestamp: null,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// analysisResultSchema
// ---------------------------------------------------------------------------

describe("analysisResultSchema", () => {
  it("정상 데이터를 통과시킨다", () => {
    const result = analysisResultSchema.safeParse(validAnalysisResult);
    expect(result.success).toBe(true);
  });

  it("member.name 이 null 이어도 통과한다", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysisResult,
      member: { ...validAnalysisResult.member, name: null },
    });
    expect(result.success).toBe(true);
  });

  it("issues 가 빈 배열이어도 통과한다", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysisResult,
      issues: [],
    });
    expect(result.success).toBe(true);
  });

  it("keywords 가 빈 배열이어도 통과한다", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysisResult,
      keywords: [],
    });
    expect(result.success).toBe(true);
  });

  it("actions.mentor 가 빈 배열이어도 통과한다", () => {
    const result = analysisResultSchema.safeParse({
      ...validAnalysisResult,
      actions: { ...validAnalysisResult.actions, mentor: [] },
    });
    expect(result.success).toBe(true);
  });

  it("summary 가 없으면 실패한다", () => {
    const { summary: _summary, ...withoutSummary } = validAnalysisResult;
    const result = analysisResultSchema.safeParse(withoutSummary);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateSegmentRequestSchema
// ---------------------------------------------------------------------------

describe("updateSegmentRequestSchema", () => {
  it("빈 객체도 통과한다 (모든 필드 optional)", () => {
    const result = updateSegmentRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("text 가 빈 문자열이면 실패한다 (min(1))", () => {
    const result = updateSegmentRequestSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("speakerLabel 이 40자를 초과하면 실패한다", () => {
    const result = updateSegmentRequestSchema.safeParse({
      speakerLabel: "a".repeat(41),
    });
    expect(result.success).toBe(false);
  });

  it("speakerTone 에 잘못된 값이 있으면 실패한다", () => {
    const result = updateSegmentRequestSchema.safeParse({
      speakerTone: "invalid_tone",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// bulkUpdateSpeakerRequestSchema
// ---------------------------------------------------------------------------

describe("bulkUpdateSpeakerRequestSchema", () => {
  it("정상 데이터를 통과시킨다", () => {
    const result = bulkUpdateSpeakerRequestSchema.safeParse({
      fromSpeakerLabel: "화자1",
      toSpeakerLabel: "김멘토",
      toSpeakerTone: "teacher",
    });
    expect(result.success).toBe(true);
  });

  it("fromSpeakerLabel 이 빈 문자열이면 실패한다", () => {
    const result = bulkUpdateSpeakerRequestSchema.safeParse({
      fromSpeakerLabel: "",
      toSpeakerLabel: "김멘토",
    });
    expect(result.success).toBe(false);
  });

  it("toSpeakerLabel 이 40자를 초과하면 실패한다", () => {
    const result = bulkUpdateSpeakerRequestSchema.safeParse({
      fromSpeakerLabel: "화자1",
      toSpeakerLabel: "a".repeat(41),
    });
    expect(result.success).toBe(false);
  });

  it("toSpeakerTone 이 없어도 통과한다 (optional)", () => {
    const result = bulkUpdateSpeakerRequestSchema.safeParse({
      fromSpeakerLabel: "화자1",
      toSpeakerLabel: "김멘토",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// linkMemberRequestSchema
// ---------------------------------------------------------------------------

describe("linkMemberRequestSchema", () => {
  it("유효한 UUID 를 통과시킨다", () => {
    const result = linkMemberRequestSchema.safeParse({
      memberId: "550e8400-e29b-41d4-a716-446655440099",
    });
    expect(result.success).toBe(true);
  });

  it("memberId 가 null 이어도 통과한다", () => {
    const result = linkMemberRequestSchema.safeParse({ memberId: null });
    expect(result.success).toBe(true);
  });

  it("UUID 형식이 아닌 문자열이면 실패한다", () => {
    const result = linkMemberRequestSchema.safeParse({
      memberId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
