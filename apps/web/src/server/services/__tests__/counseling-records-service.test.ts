import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/server/db";

const mocks = vi.hoisted(() => {
  const resolveRecordSource = (record: {
    recordSource?: string | null;
    audioStoragePath: string;
  }) => {
    if (record.recordSource) {
      return record.recordSource;
    }

    if (record.audioStoragePath.startsWith("local://demo/")) {
      return "demo_placeholder";
    }

    if (record.audioStoragePath.startsWith("text_memo://")) {
      return "text_memo";
    }

    return "audio_upload";
  };

  return {
    summarizeStudentsByName: vi.fn(),
    findOwnedRecordDetailSource: vi.fn(),
    findOwnedRecordDetailSourcesByIds: vi.fn(),
    findRecordsByUserId: vi.fn(),
    findRecordsBySpaceId: vi.fn(),
    findUnlinkedRecords: vi.fn(),
    findRecordsByMemberId: vi.fn(),
    findOwnedRecord: vi.fn(),
    mapRecordDetail: vi.fn(),
    mapRecordListItem: vi.fn(),
    mapSegmentRow: vi.fn(),
    rebuildTranscriptText: vi.fn(),
    getCounselingRecordSource: vi.fn(resolveRecordSource),
    hasPlayableAudio: vi.fn(
      (record) => resolveRecordSource(record) === "audio_upload",
    ),
    isDemoPlaceholderRecord: vi.fn(
      (record) => resolveRecordSource(record) === "demo_placeholder",
    ),
    isTextMemoRecord: vi.fn(
      (record) => resolveRecordSource(record) === "text_memo",
    ),
    sanitizeOptionalValue: vi.fn(),
    sanitizeRequiredValue: vi.fn(),
    parseSingleAudioRange: vi.fn(),
    persistAudioFile: vi.fn(),
    replaceAssistantMessages: vi.fn(),
    linkRecordToMember: vi.fn(),
    COUNSELING_RECORD_SOURCE: {
      AUDIO_UPLOAD: "audio_upload",
      TEXT_MEMO: "text_memo",
      DEMO_PLACEHOLDER: "demo_placeholder",
    },
  };
});

vi.mock("@/server/db", () => ({ getDb: vi.fn() }));
vi.mock("@/server/db/schema", () => ({
  counselingRecords: {},
  counselingTranscriptSegments: {},
}));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  desc: (value: unknown) => value,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  lt: (col: unknown, val: unknown) => ({ col, val }),
}));
vi.mock("../counseling-record-audio-storage", () => ({
  deleteCounselingAudioObject: vi.fn(),
  openCounselingAudioObjectStream: vi.fn(),
}));
vi.mock("../counseling-transcription-engine", () => ({
  transcribeStoredAudio: vi.fn(),
}));
vi.mock("../counseling-ai-service", () => ({
  analyzeCounselingRecord: vi.fn(),
  resolveSpeakerNames: vi.fn(),
}));
vi.mock("../members-service", () => ({
  getMemberByIdForUser: vi.fn(),
}));
vi.mock("../counseling-records-repository", () => ({
  COUNSELING_RECORD_SOURCE: mocks.COUNSELING_RECORD_SOURCE,
  DEFAULT_COUNSELING_TYPE: "대면 상담",
  findOwnedRecord: mocks.findOwnedRecord,
  findOwnedRecordDetailSource: mocks.findOwnedRecordDetailSource,
  findOwnedRecordDetailSourcesByIds: mocks.findOwnedRecordDetailSourcesByIds,
  findRecordsByUserId: mocks.findRecordsByUserId,
  findRecordsByMemberId: mocks.findRecordsByMemberId,
  findRecordsBySpaceId: mocks.findRecordsBySpaceId,
  findUnlinkedRecords: mocks.findUnlinkedRecords,
  getCounselingRecordSource: mocks.getCounselingRecordSource,
  hasPlayableAudio: mocks.hasPlayableAudio,
  isDemoPlaceholderRecord: mocks.isDemoPlaceholderRecord,
  isTextMemoRecord: mocks.isTextMemoRecord,
  linkRecordToMember: mocks.linkRecordToMember,
  mapRecordDetail: mocks.mapRecordDetail,
  mapRecordListItem: mocks.mapRecordListItem,
  mapSegmentRow: mocks.mapSegmentRow,
  parseSingleAudioRange: mocks.parseSingleAudioRange,
  persistAudioFile: mocks.persistAudioFile,
  replaceAssistantMessages: mocks.replaceAssistantMessages,
  rebuildTranscriptText: mocks.rebuildTranscriptText,
  sanitizeOptionalValue: mocks.sanitizeOptionalValue,
  sanitizeRequiredValue: mocks.sanitizeRequiredValue,
  summarizeStudentsByName: mocks.summarizeStudentsByName,
}));

import {
  getCounselingRecordAudio,
  getMultipleCounselingRecordDetails,
  getCounselingRecordDetail,
  listCounselingRecords,
  listCounselingRecordsByMember,
  listCounselingRecordsBySpace,
  getMultipleRecordsWithSegments,
  listUnlinkedCounselingRecords,
  listStudentSummaries,
  retryCounselingRecordTranscription,
  updateTranscriptSegment,
  bulkUpdateSpeakerLabel,
} from "../counseling-records-service";

function createDbMock(params: {
  selectedRows?: unknown[];
  updateReturning?: unknown[][];
}) {
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.limit.mockResolvedValue(params.selectedRows ?? []);

  const updateSetPayloads: unknown[] = [];
  const updateTables: unknown[] = [];
  const updateWhereArgs: unknown[][] = [];
  let updateIndex = 0;

  const db = {
    select: vi.fn(() => selectChain),
    update: vi.fn((table: unknown) => {
      const currentIndex = updateIndex++;
      updateTables[currentIndex] = table;

      const chain = {
        set: vi.fn((payload: unknown) => {
          updateSetPayloads[currentIndex] = payload;
          return chain;
        }),
        where: vi.fn((...args: unknown[]) => {
          updateWhereArgs[currentIndex] = args;
          return chain;
        }),
        returning: vi.fn(
          async () => params.updateReturning?.[currentIndex] ?? [],
        ),
      };

      return chain;
    }),
  };

  return {
    db,
    updateSetPayloads,
    updateTables,
    updateWhereArgs,
  };
}

describe("counseling-records-service bulk optimizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mapRecordListItem.mockImplementation((record) => ({
      id: record.id,
      studentName: record.studentName,
      status: record.status,
    }));
    vi.mocked(getDb).mockReset();
  });

  it("listStudentSummaries는 집계 결과를 ISO 문자열 요약으로 변환한다", async () => {
    mocks.summarizeStudentsByName.mockResolvedValue([
      {
        studentName: "홍길동",
        recordCount: 3,
        firstCounselingAt: new Date("2024-01-01T09:00:00Z"),
        lastCounselingAt: new Date("2024-01-03T09:00:00Z"),
      },
    ]);

    await expect(listStudentSummaries("user-1")).resolves.toEqual([
      {
        studentName: "홍길동",
        recordCount: 3,
        firstCounselingAt: "2024-01-01T09:00:00.000Z",
        lastCounselingAt: "2024-01-03T09:00:00.000Z",
      },
    ]);
  });

  it("listCounselingRecords는 repository 결과를 그대로 filtering 후 목록 DTO로 반환한다", async () => {
    mocks.findRecordsByUserId.mockResolvedValue([
      {
        id: "record-1",
        studentName: "홍길동",
        status: "ready",
        recordSource: "audio_upload",
        analysisStatus: "ready",
        createdByUserId: "user-1",
        audioStoragePath: "record-1/audio.webm",
      },
      {
        id: "record-2",
        studentName: "데모",
        status: "ready",
        recordSource: "demo_placeholder",
        analysisStatus: "ready",
        createdByUserId: "user-1",
        audioStoragePath: "local://demo/record-2",
      },
      {
        id: "record-3",
        studentName: "텍스트 메모",
        status: "ready",
        recordSource: "text_memo",
        analysisStatus: "idle",
        createdByUserId: "user-1",
        audioStoragePath: "text_memo://record-3",
      },
    ]);

    await expect(
      listCounselingRecords("user-1", { limit: 20 }),
    ).resolves.toEqual([
      {
        id: "record-1",
        studentName: "홍길동",
        status: "ready",
      },
      {
        id: "record-3",
        studentName: "텍스트 메모",
        status: "ready",
      },
    ]);

    expect(mocks.findRecordsByUserId).toHaveBeenCalledWith("user-1", {
      limit: 20,
    });
  });

  it("getMultipleCounselingRecordDetails는 요청 순서를 유지하고 placeholder를 제외한다", async () => {
    mocks.findOwnedRecordDetailSourcesByIds.mockResolvedValue([
      {
        record: {
          id: "record-2",
          studentName: "홍길동",
          sessionTitle: "2차 상담",
          counselingType: "대면 상담",
          createdByUserId: "user-1",
          audioStoragePath: "record-2/audio.webm",
          recordSource: "audio_upload",
          status: "ready",
          analysisStatus: "ready",
        },
        segments: [
          {
            id: "seg-2",
            recordId: "record-2",
            segmentIndex: 0,
            startMs: 0,
            speakerLabel: "S",
            text: "안녕",
          },
        ],
      },
      {
        record: {
          id: "record-1",
          studentName: "홍길동",
          sessionTitle: "1차 상담",
          counselingType: "대면 상담",
          createdByUserId: "user-1",
          audioStoragePath: "local://demo/record-1",
          recordSource: "demo_placeholder",
          status: "ready",
          analysisStatus: "ready",
        },
        segments: [],
      },
    ]);
    mocks.mapRecordDetail.mockImplementation((record, segments) => ({
      id: record.id,
      studentName: record.studentName,
      sessionTitle: record.sessionTitle,
      counselingType: record.counselingType,
      createdAt: `${record.id}-created`,
      transcriptSegments: segments,
      analysisResult: null,
    }));

    await expect(
      getMultipleCounselingRecordDetails("user-1", ["record-1", "record-2"]),
    ).resolves.toEqual([
      {
        id: "record-2",
        studentName: "홍길동",
        sessionTitle: "2차 상담",
        counselingType: "대면 상담",
        createdAt: "record-2-created",
        transcriptSegments: [
          {
            id: "seg-2",
            recordId: "record-2",
            segmentIndex: 0,
            startMs: 0,
            speakerLabel: "S",
            text: "안녕",
          },
        ],
        analysisResult: null,
      },
    ]);

    expect(mocks.findOwnedRecordDetailSourcesByIds).toHaveBeenCalledWith(
      "user-1",
      ["record-1", "record-2"],
    );
  });

  it("getMultipleRecordsWithSegments는 서로 다른 학생 이름이면 400 오류를 던진다", async () => {
    mocks.findOwnedRecordDetailSourcesByIds.mockResolvedValue([
      {
        record: {
          id: "record-1",
          studentName: "홍길동",
          sessionTitle: "1차 상담",
          counselingType: "대면 상담",
          createdByUserId: "user-1",
          audioStoragePath: "record-1/audio.webm",
          recordSource: "audio_upload",
          status: "ready",
          analysisStatus: "ready",
        },
        segments: [],
      },
      {
        record: {
          id: "record-2",
          studentName: "김영희",
          sessionTitle: "2차 상담",
          counselingType: "대면 상담",
          createdByUserId: "user-1",
          audioStoragePath: "record-2/audio.webm",
          recordSource: "audio_upload",
          status: "ready",
          analysisStatus: "ready",
        },
        segments: [],
      },
    ]);
    mocks.mapRecordDetail.mockImplementation((record) => ({
      id: record.id,
      studentName: record.studentName,
      sessionTitle: record.sessionTitle,
      counselingType: record.counselingType,
      createdAt: `${record.id}-created`,
      transcriptSegments: [],
      analysisResult: null,
    }));

    await expect(
      getMultipleRecordsWithSegments("user-1", ["record-1", "record-2"]),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("getCounselingRecordDetail는 실제 음성 기록만 상세 DTO로 반환한다", async () => {
    mocks.findOwnedRecordDetailSource.mockResolvedValue({
      record: {
        id: "record-1",
        studentName: "홍길동",
        sessionTitle: "1차 상담",
        counselingType: "대면 상담",
        createdByUserId: "user-1",
        audioStoragePath: "record-1/audio.webm",
        recordSource: "audio_upload",
        status: "ready",
        analysisStatus: "ready",
      },
      segments: [
        {
          id: "seg-1",
          recordId: "record-1",
          segmentIndex: 0,
          text: "안녕하세요",
        },
      ],
    });
    mocks.mapRecordDetail.mockReturnValue({
      id: "record-1",
      transcriptSegments: [],
    });

    await expect(
      getCounselingRecordDetail("user-1", "record-1"),
    ).resolves.toEqual({
      id: "record-1",
      transcriptSegments: [],
    });

    expect(mocks.findOwnedRecordDetailSource).toHaveBeenCalledWith(
      "user-1",
      "record-1",
    );
    expect(mocks.mapRecordDetail).toHaveBeenCalledTimes(1);
  });

  it("getCounselingRecordDetail는 placeholder 기록이면 404를 던진다", async () => {
    mocks.findOwnedRecordDetailSource.mockResolvedValue({
      record: {
        id: "record-1",
        createdByUserId: "user-1",
        audioStoragePath: "local://demo/record-1",
        recordSource: "demo_placeholder",
        status: "ready",
        analysisStatus: "ready",
      },
      segments: [],
    });

    await expect(
      getCounselingRecordDetail("user-1", "record-1"),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(mocks.mapRecordDetail).not.toHaveBeenCalled();
  });

  it("getCounselingRecordDetail는 텍스트 메모를 정상 상세 DTO로 반환한다", async () => {
    mocks.findOwnedRecordDetailSource.mockResolvedValue({
      record: {
        id: "record-1",
        studentName: "홍길동",
        sessionTitle: "텍스트 메모",
        counselingType: "텍스트 메모",
        createdByUserId: "user-1",
        audioStoragePath: "text_memo://record-1",
        recordSource: "text_memo",
        status: "ready",
        analysisStatus: "idle",
      },
      segments: [
        {
          id: "seg-1",
          recordId: "record-1",
          segmentIndex: 0,
          text: "메모 내용",
        },
      ],
    });
    mocks.mapRecordDetail.mockReturnValue({
      id: "record-1",
      transcriptSegments: [{ id: "seg-1", text: "메모 내용" }],
    });

    await expect(
      getCounselingRecordDetail("user-1", "record-1"),
    ).resolves.toEqual({
      id: "record-1",
      transcriptSegments: [{ id: "seg-1", text: "메모 내용" }],
    });
  });

  it("listCounselingRecordsBySpace는 placeholder를 제외하고 목록 DTO로 매핑한다", async () => {
    mocks.findRecordsBySpaceId.mockResolvedValue([
      {
        id: "record-1",
        studentName: "홍길동",
        status: "ready",
        recordSource: "audio_upload",
        analysisStatus: "ready",
        createdByUserId: "user-1",
        audioStoragePath: "record-1/audio.webm",
      },
      {
        id: "record-2",
        studentName: "데모",
        status: "ready",
        recordSource: "demo_placeholder",
        analysisStatus: "idle",
        createdByUserId: "user-1",
        audioStoragePath: "local://demo/record-2",
      },
      {
        id: "record-3",
        studentName: "메모",
        status: "ready",
        recordSource: "text_memo",
        analysisStatus: "idle",
        createdByUserId: "user-1",
        audioStoragePath: "text_memo://record-3",
      },
    ]);

    await expect(
      listCounselingRecordsBySpace("user-1", "space-1"),
    ).resolves.toEqual([
      {
        id: "record-1",
        studentName: "홍길동",
        status: "ready",
      },
      {
        id: "record-3",
        studentName: "메모",
        status: "ready",
      },
    ]);

    expect(mocks.findRecordsBySpaceId).toHaveBeenCalledWith(
      "user-1",
      "space-1",
      undefined,
    );
    expect(mocks.mapRecordListItem).toHaveBeenCalledTimes(2);
  });

  it("listUnlinkedCounselingRecords와 listCounselingRecordsByMember도 동일한 필터링 규칙을 유지한다", async () => {
    mocks.findUnlinkedRecords.mockResolvedValue([
      {
        id: "record-a",
        studentName: "김영희",
        status: "ready",
        recordSource: "audio_upload",
        analysisStatus: "ready",
        createdByUserId: "user-1",
        audioStoragePath: "record-a/audio.webm",
      },
      {
        id: "record-b",
        studentName: "텍스트 메모",
        status: "ready",
        recordSource: "text_memo",
        analysisStatus: "idle",
        createdByUserId: "user-1",
        audioStoragePath: "text_memo://record-b",
      },
    ]);
    mocks.findRecordsByMemberId.mockResolvedValue([
      {
        id: "record-c",
        studentName: "박민수",
        status: "ready",
        recordSource: "audio_upload",
        analysisStatus: "ready",
        createdByUserId: "user-1",
        audioStoragePath: "record-c/audio.webm",
      },
    ]);

    await expect(listUnlinkedCounselingRecords("user-1")).resolves.toEqual([
      {
        id: "record-a",
        studentName: "김영희",
        status: "ready",
      },
      {
        id: "record-b",
        studentName: "텍스트 메모",
        status: "ready",
      },
    ]);

    await expect(
      listCounselingRecordsByMember("user-1", "member-1"),
    ).resolves.toEqual([
      {
        id: "record-c",
        studentName: "박민수",
        status: "ready",
      },
    ]);

    expect(mocks.findUnlinkedRecords).toHaveBeenCalledWith("user-1", undefined);
    expect(mocks.findRecordsByMemberId).toHaveBeenCalledWith(
      "user-1",
      "member-1",
      undefined,
    );
    expect(mocks.mapRecordListItem).toHaveBeenCalledTimes(3);
  });

  it("retryCounselingRecordTranscription는 텍스트 메모면 400을 던진다", async () => {
    mocks.findOwnedRecord.mockResolvedValue({
      id: "record-1",
      createdByUserId: "user-1",
      audioStoragePath: "text_memo://record-1",
      recordSource: "text_memo",
      status: "ready",
      analysisStatus: "idle",
    });

    await expect(
      retryCounselingRecordTranscription(
        { id: "user-1", email: "mentor@example.com" } as never,
        "record-1",
      ),
    ).rejects.toMatchObject({
      status: 400,
      message:
        "텍스트 메모는 재전사할 수 없습니다. 원문 내용을 직접 수정해 주세요.",
    });
  });

  it("retryCounselingRecordTranscription는 partial transcript 상태면 기존 chunk를 유지한 채 누락 구간만 다시 시도한다", async () => {
    const dbMock = createDbMock({});
    const preservedChunks = [
      {
        index: 0,
        offsetMs: 0,
        transcriptText: "첫 번째 구간",
        language: "ko",
        durationMs: 30_000,
        model: "gpt-4o-transcribe-diarize",
        segments: [
          {
            startMs: 0,
            endMs: 15_000,
            speakerLabel: "화자 1",
            speakerTone: "unknown",
            text: "첫 번째 구간",
          },
        ],
      },
      {
        index: 2,
        offsetMs: 60_000,
        transcriptText: "세 번째 구간",
        language: "ko",
        durationMs: 30_000,
        model: "gpt-4o-transcribe-diarize",
        segments: [
          {
            startMs: 60_000,
            endMs: 75_000,
            speakerLabel: "화자 2",
            speakerTone: "unknown",
            text: "세 번째 구간",
          },
        ],
      },
    ];

    vi.mocked(getDb).mockReturnValue(dbMock.db as never);
    mocks.findOwnedRecord
      .mockResolvedValueOnce({
        id: "record-1",
        createdByUserId: "user-1",
        audioStoragePath: "record-1/audio.webm",
        recordSource: "audio_upload",
        status: "processing",
        processingStage: "partial_transcript_ready",
        processingChunkCount: 3,
        transcriptionChunks: preservedChunks,
        analysisStatus: "idle",
      })
      .mockResolvedValue({
        id: "record-1",
        createdByUserId: "user-1",
        audioStoragePath: "record-1/audio.webm",
        recordSource: "audio_upload",
        status: "ready",
        analysisStatus: "idle",
      });
    mocks.findOwnedRecordDetailSource.mockResolvedValue({
      record: {
        id: "record-1",
        createdByUserId: "user-1",
        audioStoragePath: "record-1/audio.webm",
        recordSource: "audio_upload",
        status: "processing",
        analysisStatus: "idle",
        processingStage: "queued",
      },
      segments: [],
    });
    mocks.mapRecordDetail.mockReturnValue({
      id: "record-1",
      status: "processing",
      processingStage: "queued",
      transcriptSegments: [],
    });

    await expect(
      retryCounselingRecordTranscription(
        { id: "user-1", email: "mentor@example.com" } as never,
        "record-1",
      ),
    ).resolves.toEqual({
      id: "record-1",
      status: "processing",
      processingStage: "queued",
      transcriptSegments: [],
    });

    expect(dbMock.updateSetPayloads[0]).toMatchObject({
      status: "processing",
      processingStage: "queued",
      processingChunkCount: 3,
      processingChunkCompletedCount: 2,
      transcriptionChunks: preservedChunks,
      processingMessage:
        "누락된 전사 구간만 다시 준비하고 있습니다. 이미 저장된 원문은 유지됩니다.",
      analysisStatus: "idle",
      analysisProgress: 0,
      analysisErrorMessage: null,
      analysisResult: null,
      analysisCompletedAt: null,
    });
  });

  it("getCounselingRecordAudio는 텍스트 메모면 404를 던진다", async () => {
    mocks.findOwnedRecord.mockResolvedValue({
      id: "record-1",
      createdByUserId: "user-1",
      audioStoragePath: "text_memo://record-1",
      recordSource: "text_memo",
      status: "ready",
      analysisStatus: "idle",
    });

    await expect(
      getCounselingRecordAudio("user-1", "record-1"),
    ).rejects.toMatchObject({
      status: 404,
      message: "텍스트 메모에는 재생할 원본 음성이 없습니다.",
    });
  });

  it("updateTranscriptSegment는 수정 필드가 없으면 기존 segment를 그대로 반환한다", async () => {
    const dbMock = createDbMock({
      selectedRows: [
        {
          id: "segment-1",
          recordId: "record-1",
          text: "기존 문장",
          speakerLabel: "멘토",
          speakerTone: "teacher",
        },
      ],
    });
    vi.mocked(getDb).mockReturnValue(dbMock.db as never);
    mocks.findOwnedRecord.mockResolvedValue({
      id: "record-1",
      status: "ready",
    });
    mocks.mapSegmentRow.mockReturnValue({ id: "segment-1", text: "기존 문장" });

    await expect(
      updateTranscriptSegment("user-1", "record-1", "segment-1", {}),
    ).resolves.toEqual({ id: "segment-1", text: "기존 문장" });

    expect(dbMock.db.update).not.toHaveBeenCalled();
    expect(mocks.rebuildTranscriptText).not.toHaveBeenCalled();
  });

  it("updateTranscriptSegment는 원문 수정 후 분석 상태를 queued로 초기화한다", async () => {
    const dbMock = createDbMock({
      selectedRows: [
        {
          id: "segment-1",
          recordId: "record-1",
          text: "기존 문장",
          speakerLabel: "멘토",
          speakerTone: "teacher",
        },
      ],
      updateReturning: [[{ id: "segment-1", text: "수정된 문장" }]],
    });
    vi.mocked(getDb).mockReturnValue(dbMock.db as never);
    mocks.findOwnedRecord
      .mockResolvedValueOnce({ id: "record-1", status: "ready" })
      .mockResolvedValueOnce({
        id: "record-1",
        status: "ready",
        analysisStatus: "queued",
        createdByUserId: "user-1",
      });
    mocks.mapSegmentRow.mockReturnValue({
      id: "segment-1",
      text: "수정된 문장",
    });

    await expect(
      updateTranscriptSegment("user-1", "record-1", "segment-1", {
        text: "수정된 문장",
      }),
    ).resolves.toEqual({ id: "segment-1", text: "수정된 문장" });

    expect(mocks.rebuildTranscriptText).toHaveBeenCalledWith("record-1");
    expect(dbMock.updateSetPayloads[0]).toMatchObject({ text: "수정된 문장" });
    expect(dbMock.updateSetPayloads[1]).toMatchObject({
      analysisResult: null,
      analysisStatus: "queued",
      analysisProgress: 0,
      analysisErrorMessage: null,
      analysisCompletedAt: null,
      processingStage: "transcript_ready",
      processingMessage: "원문이 수정되어 AI 분석을 다시 준비합니다.",
    });
    expect(mocks.findOwnedRecord).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "record-1",
    );
  });

  it("bulkUpdateSpeakerLabel는 변경된 segment가 없으면 분석 상태를 초기화하지 않는다", async () => {
    const dbMock = createDbMock({ updateReturning: [[]] });
    vi.mocked(getDb).mockReturnValue(dbMock.db as never);
    mocks.findOwnedRecord.mockResolvedValue({
      id: "record-1",
      status: "ready",
    });

    await expect(
      bulkUpdateSpeakerLabel("user-1", "record-1", "화자 A", "멘토"),
    ).resolves.toBe(0);

    expect(mocks.rebuildTranscriptText).not.toHaveBeenCalled();
    expect(dbMock.db.update).toHaveBeenCalledTimes(1);
  });

  it("bulkUpdateSpeakerLabel는 화자 변경 후 분석 상태를 queued로 초기화한다", async () => {
    const dbMock = createDbMock({
      updateReturning: [[{ id: "segment-1" }, { id: "segment-2" }]],
    });
    vi.mocked(getDb).mockReturnValue(dbMock.db as never);
    mocks.findOwnedRecord
      .mockResolvedValueOnce({ id: "record-1", status: "ready" })
      .mockResolvedValueOnce({
        id: "record-1",
        status: "ready",
        analysisStatus: "queued",
        createdByUserId: "user-1",
      });

    await expect(
      bulkUpdateSpeakerLabel("user-1", "record-1", "화자 A", "멘토", "teacher"),
    ).resolves.toBe(2);

    expect(mocks.rebuildTranscriptText).toHaveBeenCalledWith("record-1");
    expect(dbMock.updateSetPayloads[0]).toMatchObject({
      speakerLabel: "멘토",
      speakerTone: "teacher",
    });
    expect(dbMock.updateSetPayloads[1]).toMatchObject({
      analysisResult: null,
      analysisStatus: "queued",
      analysisProgress: 0,
      analysisErrorMessage: null,
      analysisCompletedAt: null,
      processingStage: "transcript_ready",
      processingMessage: "화자 정보가 수정되어 AI 분석을 다시 준비합니다.",
    });
    expect(mocks.findOwnedRecord).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "record-1",
    );
  });

  it("updateTranscriptSegment는 partial transcript 상태면 400을 던진다", async () => {
    mocks.findOwnedRecord.mockResolvedValue({
      id: "record-1",
      status: "processing",
      processingStage: "partial_transcript_ready",
    });

    await expect(
      updateTranscriptSegment("user-1", "record-1", "segment-1", {
        text: "수정된 문장",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message:
        "원문 전사가 모두 준비된 기록만 편집할 수 있습니다. 누락 구간 복구 후 다시 시도해 주세요.",
    });
  });
});
