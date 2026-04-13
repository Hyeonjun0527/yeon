import { describe, expect, it } from "vitest";

import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";

import {
  buildStudentReportDocument,
  createDefaultStudentReportSettings,
} from "../report-builder";
import type { Member } from "../types";

const member: Member = {
  id: "member-1",
  spaceId: "space-1",
  name: "김서윤",
  email: "seoyun@example.com",
  phone: "010-1111-2222",
  status: "active",
  initialRiskLevel: "medium",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};

const records: CounselingRecordListItem[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    spaceId: "space-1",
    memberId: "member-1",
    studentName: "김서윤",
    sessionTitle: "3월 진도 점검",
    counselingType: "학습 상담",
    counselorName: "멘토 A",
    status: "ready",
    preview: "최근 과제 누락이 있었지만 회복 의지가 확인됨.",
    tags: [],
    audioOriginalName: "a.m4a",
    audioMimeType: "audio/mp4",
    audioByteSize: 100,
    audioDurationMs: 60000,
    transcriptSegmentCount: 10,
    transcriptTextLength: 1200,
    processingStage: "completed",
    processingProgress: 100,
    processingMessage: null,
    processingChunkCount: 1,
    processingChunkCompletedCount: 1,
    recordSource: "audio_upload",
    transcriptionAttemptCount: 1,
    analysisStatus: "ready",
    analysisProgress: 100,
    analysisErrorMessage: null,
    analysisAttemptCount: 1,
    language: "ko",
    sttModel: null,
    errorMessage: null,
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    transcriptionCompletedAt: "2026-04-10T00:00:00.000Z",
    analysisCompletedAt: "2026-04-10T00:00:00.000Z",
  },
];

const detailsById: Record<string, CounselingRecordDetail> = {
  "11111111-1111-1111-1111-111111111111": {
    ...records[0],
    transcriptText: "...",
    transcriptSegments: [],
    audioUrl: null,
    analysisResult: {
      summary: "과제 누락 원인을 시간 관리 문제로 파악했고 회복 의지가 높다.",
      member: {
        name: "김서윤",
        traits: ["성실함"],
        emotion: "불안하지만 의지가 있음",
      },
      issues: [
        { title: "시간 관리 흔들림", detail: "과제 제출 리듬이 무너짐" },
      ],
      actions: {
        mentor: ["주간 체크포인트를 더 촘촘히 잡기"],
        member: ["과제 제출 전날 체크리스트 작성"],
        nextSession: ["시간 관리 루틴 정착 여부 확인"],
      },
      keywords: ["과제", "시간관리"],
    },
    assistantMessages: [],
  },
};

describe("buildStudentReportDocument", () => {
  it("여러 상담을 묶는 촘촘한 2단 요약 리포트 문서를 생성한다", () => {
    const document = buildStudentReportDocument({
      member,
      records,
      detailsById,
      settings: createDefaultStudentReportSettings(member.name),
      generatedAt: new Date("2026-04-11T12:00:00.000Z"),
    });

    expect(document.title).toContain("김서윤 상담 리포트");
    expect(document.summary).toContain("상담 1건을 묶어");
    expect(document.sections.map((section) => section.title)).toEqual([
      "핵심 요약",
      "상담 기록 요약",
    ]);
    expect(document.sections[0]?.bullets).toContain(
      "시간 관리 흔들림: 과제 제출 리듬이 무너짐",
    );
    expect(document.sections[1]?.bullets.join(" ")).toContain("3월 진도 점검");
  });

  it("분석 결과가 없어도 preview 기반으로 2단 리포트를 유지한다", () => {
    const document = buildStudentReportDocument({
      member,
      records,
      settings: createDefaultStudentReportSettings(member.name),
    });

    expect(document.sections.map((section) => section.title)).toEqual([
      "핵심 요약",
      "상담 기록 요약",
    ]);
    expect(document.sections[0]?.bullets[0]).toContain(
      "최근 과제 누락이 있었지만 회복 의지가 확인됨.",
    );
    expect(document.sections[1]?.bullets[0]).toContain(
      "최근 과제 누락이 있었지만 회복 의지가 확인됨.",
    );
  });

  it("운영 메모와 후속 액션 관련 출력은 리포트에서 제거한다", () => {
    const document = buildStudentReportDocument({
      member,
      records,
      detailsById,
      settings: createDefaultStudentReportSettings(member.name),
    });

    expect(document.meta.some((item) => item.label === "운영 메모")).toBe(
      false,
    );
    expect(document.meta.some((item) => item.label === "AI 분석 반영")).toBe(
      false,
    );
    expect(
      document.sections.some((section) => section.title === "후속 액션"),
    ).toBe(false);
    expect(
      document.sections.some((section) => section.title === "최근 운영 메모"),
    ).toBe(false);
  });
});
