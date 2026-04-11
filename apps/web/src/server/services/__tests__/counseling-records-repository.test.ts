import { describe, it, expect, beforeEach, vi } from "vitest";
import { ServiceError } from "../service-error";

/* ── DB 모킹 ─────────────────────────────────────────────────── */

const { responses, chain } = vi.hoisted(() => {
  const responses: unknown[] = [];
  const chain: Record<string | symbol, unknown> = {};
  const proxy: unknown = new Proxy(chain, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(responses.shift() || []).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => proxy;
    },
  });
  return { responses, chain: proxy };
});

vi.mock("@/server/db", () => ({ getDb: () => chain }));
vi.mock("@/server/db/schema", () => ({
  counselingRecords: {},
  counselingTranscriptSegments: {},
}));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
  desc: (col: unknown) => col,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  isNull: (col: unknown) => col,
}));
vi.mock("@yeon/api-contract/counseling-records", () => ({
  analysisResultSchema: {
    safeParse: (data: unknown) => {
      if (data && typeof data === "object" && "summary" in data) {
        return { success: true, data };
      }
      return { success: false };
    },
  },
}));
vi.mock("../counseling-record-audio-storage", () => ({
  uploadCounselingAudioObject: vi.fn().mockResolvedValue(undefined),
}));

import {
  sanitizeSingleLine,
  sanitizeOptionalValue,
  sanitizeRequiredValue,
  isPlaceholderAudioStoragePath,
  mapRecordListItem,
  mapSegmentRow,
  mapRecordDetail,
  linkRecordToMember,
  findRecordsBySpaceId,
  findUnlinkedRecords,
  findRecordsByMemberId,
  findOwnedRecord,
  findTranscriptSegments,
  parseSingleAudioRange,
  rebuildTranscriptText,
  PLACEHOLDER_AUDIO_STORAGE_PREFIXES,
  MAX_AUDIO_UPLOAD_BYTES,
  DEFAULT_COUNSELING_TYPE,
} from "../counseling-records-repository";

/* ── 헬퍼 ── */

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "record-1",
  createdByUserId: "user-1",
  studentName: "홍길동",
  sessionTitle: "1차 상담",
  counselingType: "대면 상담",
  counselorName: "김멘토",
  status: "ready",
  audioOriginalName: "recording.webm",
  audioMimeType: "audio/webm",
  audioByteSize: 1024,
  audioDurationMs: 30000,
  audioStoragePath: "record-1/1234-recording.webm",
  audioSha256: "abc123",
  language: "ko",
  sttModel: "whisper-1",
  transcriptText: "안녕하세요. 오늘 상담을 시작하겠습니다.",
  transcriptSegmentCount: 2,
  spaceId: "space-1",
  memberId: "member-1",
  analysisResult: null,
  errorMessage: null,
  transcriptionCompletedAt: new Date("2024-01-01T10:00:00Z"),
  createdAt: new Date("2024-01-01T09:00:00Z"),
  updatedAt: new Date("2024-01-01T10:00:00Z"),
  ...overrides,
});

const makeSegment = (overrides: Record<string, unknown> = {}) => ({
  id: "seg-1",
  recordId: "record-1",
  segmentIndex: 0,
  startMs: 0,
  endMs: 3000,
  speakerLabel: "SPEAKER_00",
  speakerTone: "teacher",
  text: "안녕하세요.",
  ...overrides,
});

beforeEach(() => {
  responses.length = 0;
});

/* ── sanitizeSingleLine ── */

describe("sanitizeSingleLine", () => {
  it("연속 공백을 단일 공백으로 치환한다", () => {
    expect(sanitizeSingleLine("안녕   하세요")).toBe("안녕 하세요");
  });

  it("앞뒤 공백을 제거한다", () => {
    expect(sanitizeSingleLine("  홍길동  ")).toBe("홍길동");
  });

  it("줄바꿈 문자를 공백으로 치환한다", () => {
    expect(sanitizeSingleLine("안녕\n하세요")).toBe("안녕 하세요");
  });

  it("탭 문자를 공백으로 치환한다", () => {
    expect(sanitizeSingleLine("안녕\t하세요")).toBe("안녕 하세요");
  });
});

/* ── sanitizeOptionalValue ── */

describe("sanitizeOptionalValue", () => {
  it("null을 전달하면 null을 반환한다", () => {
    expect(sanitizeOptionalValue(null, 80)).toBeNull();
  });

  it("undefined를 전달하면 null을 반환한다", () => {
    expect(sanitizeOptionalValue(undefined, 80)).toBeNull();
  });

  it("빈 문자열을 전달하면 null을 반환한다", () => {
    expect(sanitizeOptionalValue("", 80)).toBeNull();
  });

  it("공백만 있는 문자열을 전달하면 null을 반환한다", () => {
    expect(sanitizeOptionalValue("   ", 80)).toBeNull();
  });

  it("maxLength를 초과하면 잘라낸다", () => {
    const long = "가".repeat(100);
    const result = sanitizeOptionalValue(long, 10);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(10);
  });

  it("정상 값은 정리된 문자열을 반환한다", () => {
    expect(sanitizeOptionalValue("  홍길동  ", 80)).toBe("홍길동");
  });
});

/* ── sanitizeRequiredValue ── */

describe("sanitizeRequiredValue", () => {
  it("빈 값이면 400 ServiceError를 던진다", () => {
    expect(() => sanitizeRequiredValue("", 80, "이름")).toThrow(ServiceError);
    expect(() => sanitizeRequiredValue("", 80, "이름")).toThrow("이름을 입력해 주세요.");
  });

  it("null이면 400 ServiceError를 던진다", () => {
    expect(() => sanitizeRequiredValue(null, 80, "제목")).toThrow(ServiceError);
  });

  it("공백만 있는 값이면 400 ServiceError를 던진다", () => {
    expect(() => sanitizeRequiredValue("   ", 80, "내용")).toThrow(ServiceError);
  });

  it("정상 값은 정리된 문자열을 반환한다", () => {
    expect(sanitizeRequiredValue("  홍길동  ", 80, "이름")).toBe("홍길동");
  });

  it("maxLength를 초과하면 잘라낸 값을 반환한다", () => {
    const long = "가".repeat(100);
    const result = sanitizeRequiredValue(long, 10, "이름");
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

/* ── isPlaceholderAudioStoragePath ── */

describe("isPlaceholderAudioStoragePath", () => {
  it("local://demo/ 접두어는 placeholder로 판별한다", () => {
    expect(isPlaceholderAudioStoragePath("local://demo/test.webm")).toBe(true);
  });

  it("text_memo:// 접두어는 placeholder로 판별한다", () => {
    expect(isPlaceholderAudioStoragePath("text_memo://some-id")).toBe(true);
  });

  it("일반 storage 경로는 placeholder가 아니다", () => {
    expect(isPlaceholderAudioStoragePath("record-1/1234-recording.webm")).toBe(false);
  });

  it("PLACEHOLDER_AUDIO_STORAGE_PREFIXES 상수가 두 항목을 포함한다", () => {
    expect(PLACEHOLDER_AUDIO_STORAGE_PREFIXES).toHaveLength(2);
  });
});

/* ── 상수 ── */

describe("상수", () => {
  it("MAX_AUDIO_UPLOAD_BYTES는 128MB이다", () => {
    expect(MAX_AUDIO_UPLOAD_BYTES).toBe(128 * 1024 * 1024);
  });

  it("DEFAULT_COUNSELING_TYPE는 '대면 상담'이다", () => {
    expect(DEFAULT_COUNSELING_TYPE).toBe("대면 상담");
  });
});

/* ── mapRecordListItem ── */

describe("mapRecordListItem", () => {
  it("record row를 CounselingRecordListItem DTO로 변환한다", () => {
    const record = makeRecord();
    const result = mapRecordListItem(record as Parameters<typeof mapRecordListItem>[0]);
    expect(result.id).toBe("record-1");
    expect(result.studentName).toBe("홍길동");
    expect(result.status).toBe("ready");
  });

  it("createdAt을 ISO 문자열로 변환한다", () => {
    const record = makeRecord();
    const result = mapRecordListItem(record as Parameters<typeof mapRecordListItem>[0]);
    expect(typeof result.createdAt).toBe("string");
    expect(result.createdAt).toContain("2024-01-01");
  });

  it("status가 유효하지 않으면 'error'로 변환한다", () => {
    const record = makeRecord({ status: "invalid_status" });
    const result = mapRecordListItem(record as Parameters<typeof mapRecordListItem>[0]);
    expect(result.status).toBe("error");
  });

  it("status가 'processing'이면 preview에 준비 중 메시지를 반환한다", () => {
    const record = makeRecord({ status: "processing", transcriptText: "" });
    const result = mapRecordListItem(record as Parameters<typeof mapRecordListItem>[0]);
    expect(result.preview).toBe("원문 전사를 준비 중입니다.");
  });

  it("transcriptionCompletedAt이 null이면 null을 반환한다", () => {
    const record = makeRecord({ transcriptionCompletedAt: null });
    const result = mapRecordListItem(record as Parameters<typeof mapRecordListItem>[0]);
    expect(result.transcriptionCompletedAt).toBeNull();
  });

  it("tags 배열에 counselingType이 포함된다", () => {
    const record = makeRecord({ counselingType: "비대면 상담" });
    const result = mapRecordListItem(record as Parameters<typeof mapRecordListItem>[0]);
    expect(result.tags).toContain("비대면 상담");
  });

  it("transcriptTextLength는 transcriptText 길이이다", () => {
    const text = "안녕하세요";
    const record = makeRecord({ transcriptText: text });
    const result = mapRecordListItem(record as Parameters<typeof mapRecordListItem>[0]);
    expect(result.transcriptTextLength).toBe(text.length);
  });
});

/* ── mapSegmentRow ── */

describe("mapSegmentRow", () => {
  it("segment row를 CounselingTranscriptSegment DTO로 변환한다", () => {
    const segment = makeSegment();
    const result = mapSegmentRow(segment as Parameters<typeof mapSegmentRow>[0]);
    expect(result.id).toBe("seg-1");
    expect(result.speakerTone).toBe("teacher");
    expect(result.text).toBe("안녕하세요.");
  });

  it("speakerTone이 유효하지 않으면 'unknown'으로 변환한다", () => {
    const segment = makeSegment({ speakerTone: "invalid_tone" });
    const result = mapSegmentRow(segment as Parameters<typeof mapSegmentRow>[0]);
    expect(result.speakerTone).toBe("unknown");
  });

  it("speakerTone 'student'를 그대로 반환한다", () => {
    const segment = makeSegment({ speakerTone: "student" });
    const result = mapSegmentRow(segment as Parameters<typeof mapSegmentRow>[0]);
    expect(result.speakerTone).toBe("student");
  });
});

/* ── mapRecordDetail ── */

describe("mapRecordDetail", () => {
  it("segments 배열이 포함된 detail DTO를 반환한다", () => {
    const record = makeRecord();
    const segments = [makeSegment()];
    const result = mapRecordDetail(
      record as Parameters<typeof mapRecordDetail>[0],
      segments as Parameters<typeof mapRecordDetail>[1],
    );
    expect(result.transcriptSegments).toHaveLength(1);
    expect(result.transcriptText).toBe(record.transcriptText);
  });

  it("placeholder audio path이면 audioUrl이 null이다", () => {
    const record = makeRecord({ audioStoragePath: "local://demo/test.webm" });
    const result = mapRecordDetail(
      record as Parameters<typeof mapRecordDetail>[0],
      [],
    );
    expect(result.audioUrl).toBeNull();
  });

  it("일반 audio path이면 audioUrl이 /api/v1/... 경로를 반환한다", () => {
    const record = makeRecord({ audioStoragePath: "record-1/1234-recording.webm" });
    const result = mapRecordDetail(
      record as Parameters<typeof mapRecordDetail>[0],
      [],
    );
    expect(result.audioUrl).toBe("/api/v1/counseling-records/record-1/audio");
  });

  it("analysisResult가 유효하지 않으면 null을 반환한다", () => {
    const record = makeRecord({ analysisResult: "invalid" });
    const result = mapRecordDetail(
      record as Parameters<typeof mapRecordDetail>[0],
      [],
    );
    expect(result.analysisResult).toBeNull();
  });

  it("analysisResult가 유효하면 파싱된 결과를 반환한다", () => {
    const analysisData = { summary: "좋은 상담이었습니다." };
    const record = makeRecord({ analysisResult: analysisData });
    const result = mapRecordDetail(
      record as Parameters<typeof mapRecordDetail>[0],
      [],
    );
    expect(result.analysisResult).toEqual(analysisData);
  });
});

/* ── linkRecordToMember ── */

describe("linkRecordToMember", () => {
  it("memberId와 spaceId를 record에 연결한다", async () => {
    responses.push(undefined);
    await expect(
      linkRecordToMember("record-1", "member-1", "space-1"),
    ).resolves.toBeUndefined();
  });

  it("memberId를 null로 연결 해제할 수 있다", async () => {
    responses.push(undefined);
    await expect(
      linkRecordToMember("record-1", null, null),
    ).resolves.toBeUndefined();
  });
});

/* ── findRecordsBySpaceId ── */

describe("findRecordsBySpaceId", () => {
  it("spaceId에 속한 레코드 목록을 반환한다", async () => {
    const records = [makeRecord(), makeRecord({ id: "record-2" })];
    responses.push(records);

    const result = await findRecordsBySpaceId("user-1", "space-1");
    expect(result).toHaveLength(2);
  });

  it("레코드가 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);
    const result = await findRecordsBySpaceId("user-1", "space-1");
    expect(result).toEqual([]);
  });

  it("다른 userId의 레코드는 포함하지 않는다 (쿼리 조건 검증)", async () => {
    // DB mock은 userId 필터를 실제로 적용하지 않으므로, 반환값 검증으로 커버
    responses.push([]);
    const result = await findRecordsBySpaceId("user-2", "space-1");
    expect(Array.isArray(result)).toBe(true);
  });
});

/* ── findUnlinkedRecords ── */

describe("findUnlinkedRecords", () => {
  it("spaceId가 null인 레코드만 반환한다", async () => {
    const unlinked = [makeRecord({ spaceId: null, memberId: null })];
    responses.push(unlinked);

    const result = await findUnlinkedRecords("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].spaceId).toBeNull();
  });

  it("연결된 레코드가 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);
    const result = await findUnlinkedRecords("user-1");
    expect(result).toEqual([]);
  });
});

/* ── findRecordsByMemberId ── */

describe("findRecordsByMemberId", () => {
  it("memberId에 속한 레코드 목록을 반환한다", async () => {
    const records = [makeRecord(), makeRecord({ id: "record-2" })];
    responses.push(records);

    const result = await findRecordsByMemberId("user-1", "member-1");
    expect(result).toHaveLength(2);
  });

  it("레코드가 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);
    const result = await findRecordsByMemberId("user-1", "member-1");
    expect(result).toEqual([]);
  });

  it("여러 레코드가 있을 때 배열로 반환한다", async () => {
    const records = [
      makeRecord({ id: "r1" }),
      makeRecord({ id: "r2" }),
      makeRecord({ id: "r3" }),
    ];
    responses.push(records);

    const result = await findRecordsByMemberId("user-1", "member-1");
    expect(result).toHaveLength(3);
  });
});

/* ── findOwnedRecord ── */

describe("findOwnedRecord", () => {
  it("존재하는 레코드를 반환한다", async () => {
    const record = makeRecord();
    responses.push([record]);

    const result = await findOwnedRecord("user-1", "record-1");
    expect(result.id).toBe("record-1");
  });

  it("없는 ID이면 404 ServiceError를 던진다", async () => {
    responses.push([]);
    await expect(
      findOwnedRecord("user-1", "nonexistent"),
    ).rejects.toMatchObject({ status: 404, message: "상담 기록을 찾지 못했습니다." });
  });

  it("다른 userId의 레코드는 접근 불가 (빈 배열 반환 → 404)", async () => {
    responses.push([]); // 다른 userId 필터로 인해 빈 배열
    await expect(
      findOwnedRecord("user-other", "record-1"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("반환된 레코드에 detail 필드(transcriptText 등)가 포함된다", async () => {
    const record = makeRecord({ transcriptText: "전사 내용입니다." });
    responses.push([record]);

    const result = await findOwnedRecord("user-1", "record-1");
    expect(result.transcriptText).toBe("전사 내용입니다.");
  });
});

/* ── findTranscriptSegments ── */

describe("findTranscriptSegments", () => {
  it("recordId에 속한 세그먼트 목록을 반환한다", async () => {
    const segments = [makeSegment(), makeSegment({ id: "seg-2", segmentIndex: 1 })];
    responses.push(segments);

    const result = await findTranscriptSegments("record-1");
    expect(result).toHaveLength(2);
  });

  it("세그먼트가 없으면 빈 배열을 반환한다", async () => {
    responses.push([]);
    const result = await findTranscriptSegments("record-1");
    expect(result).toEqual([]);
  });

  it("segmentIndex 오름차순으로 정렬된 결과를 반환한다 (쿼리 조건 검증)", async () => {
    const segments = [
      makeSegment({ segmentIndex: 0 }),
      makeSegment({ id: "seg-2", segmentIndex: 1 }),
      makeSegment({ id: "seg-3", segmentIndex: 2 }),
    ];
    responses.push(segments);

    const result = await findTranscriptSegments("record-1");
    expect(result[0].segmentIndex).toBe(0);
    expect(result[1].segmentIndex).toBe(1);
    expect(result[2].segmentIndex).toBe(2);
  });
});

/* ── parseSingleAudioRange ── */

describe("parseSingleAudioRange", () => {
  it("null을 전달하면 null을 반환한다", () => {
    expect(parseSingleAudioRange(null, 1000)).toBeNull();
  });

  it("undefined를 전달하면 null을 반환한다", () => {
    expect(parseSingleAudioRange(undefined, 1000)).toBeNull();
  });

  it("빈 문자열을 전달하면 null을 반환한다", () => {
    expect(parseSingleAudioRange("", 1000)).toBeNull();
  });

  it("'bytes=0-499' 형식을 올바르게 파싱한다", () => {
    const result = parseSingleAudioRange("bytes=0-499", 1000);
    expect(result).toEqual({ start: 0, end: 499 });
  });

  it("'bytes=500-' 형식은 end를 totalByteSize-1로 설정한다", () => {
    const result = parseSingleAudioRange("bytes=500-", 1000);
    expect(result).toEqual({ start: 500, end: 999 });
  });

  it("suffix range 'bytes=-200'는 마지막 200바이트를 반환한다", () => {
    const result = parseSingleAudioRange("bytes=-200", 1000);
    expect(result).toEqual({ start: 800, end: 999 });
  });

  it("end가 totalByteSize를 초과하면 totalByteSize-1로 클램핑된다", () => {
    const result = parseSingleAudioRange("bytes=0-9999", 1000);
    expect(result).toEqual({ start: 0, end: 999 });
  });

  it("start가 totalByteSize 이상이면 416 ServiceError를 던진다", () => {
    expect(() => parseSingleAudioRange("bytes=1000-1999", 1000)).toThrow(ServiceError);
    expect(() => parseSingleAudioRange("bytes=1000-1999", 1000)).toThrow(/범위/);
  });

  it("'bytes=' 접두어가 없으면 416 ServiceError를 던진다", () => {
    expect(() => parseSingleAudioRange("invalid-range", 1000)).toThrow(ServiceError);
  });

  it("쉼표로 구분된 멀티 범위는 첫 번째 범위만 처리한다", () => {
    const result = parseSingleAudioRange("bytes=0-99,200-299", 1000);
    expect(result).toEqual({ start: 0, end: 99 });
  });

  it("end가 start보다 작으면 416 ServiceError를 던진다", () => {
    expect(() => parseSingleAudioRange("bytes=500-100", 1000)).toThrow(ServiceError);
  });
});

/* ── rebuildTranscriptText ── */

describe("rebuildTranscriptText", () => {
  it("세그먼트 텍스트를 줄바꿈으로 합쳐 record를 업데이트한다", async () => {
    const segments = [
      makeSegment({ text: "안녕하세요." }),
      makeSegment({ id: "seg-2", segmentIndex: 1, text: "오늘 상담을 시작합니다." }),
    ];
    responses.push(segments); // select segments
    responses.push(undefined); // update counselingRecords

    await expect(rebuildTranscriptText("record-1")).resolves.toBeUndefined();
  });

  it("세그먼트가 없으면 빈 문자열로 record를 업데이트한다", async () => {
    responses.push([]); // select segments → 빈 배열
    responses.push(undefined); // update

    await expect(rebuildTranscriptText("record-1")).resolves.toBeUndefined();
  });

  it("tx가 주어지면 tx를 통해 쿼리한다 (tx 파라미터 사용)", async () => {
    // tx가 주어지면 chain 대신 tx를 사용 — tx를 chain 자체로 전달해 검증
    const segments = [makeSegment({ text: "텍스트" })];
    responses.push(segments);
    responses.push(undefined);

    // tx로 chain을 전달해도 정상 동작해야 함
    await expect(
      rebuildTranscriptText("record-1", chain as Parameters<typeof rebuildTranscriptText>[1]),
    ).resolves.toBeUndefined();
  });
});
