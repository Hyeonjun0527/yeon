import { describe, expect, it } from "vitest";

import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";

import {
  buildStudentReportDocument,
  createDefaultStudentReportSettings,
} from "../report-builder";
import type { Member, Memo } from "../types";

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

const memos: Memo[] = [
  {
    id: "memo-1",
    date: "2026-04-11",
    text: "과제 제출 루틴 확인이 필요함",
    author: "멘토 A",
  },
  {
    id: "memo-2",
    date: "2026-04-09",
    text: "보호자 공유 전 표현 수위를 점검하기",
    author: "멘토 B",
  },
];

describe("buildStudentReportDocument", () => {
  it("상담 분석 데이터를 반영한 구조화 리포트 문서를 생성한다", () => {
    const document = buildStudentReportDocument({
      member,
      records,
      detailsById,
      settings: createDefaultStudentReportSettings(member.name),
      generatedAt: new Date("2026-04-11T12:00:00.000Z"),
    });

    expect(document.title).toContain("김서윤 상담 리포트");
    expect(document.summary).toContain("최근 상담 1건");
    expect(document.sections.map((section) => section.title)).toEqual([
      "핵심 키워드",
      "주요 이슈",
      "후속 액션",
      "상담 기록 요약",
    ]);
    expect(document.sections[0]?.bullets).toContain("과제");
    expect(document.sections[2]?.bullets.join(" ")).toContain(
      "주간 체크포인트를 더 촘촘히 잡기",
    );
  });

  it("작성 메모와 섹션 옵션을 문서 구조에 반영한다", () => {
    const document = buildStudentReportDocument({
      member,
      records,
      detailsById,
      settings: {
        ...createDefaultStudentReportSettings(member.name),
        focusNote: "보호자 공유 전 전달 톤을 차분하게 유지",
        includeKeywords: false,
        includeActions: false,
      },
    });

    expect(document.sections[0]?.title).toBe("작성 메모");
    expect(document.sections[0]?.bullets[0]).toContain("보호자 공유");
    expect(
      document.sections.some((section) => section.title === "핵심 키워드"),
    ).toBe(false);
    expect(
      document.sections.some((section) => section.title === "후속 액션"),
    ).toBe(false);
  });

  it("서버 저장 메모를 리포트 메타와 최근 운영 메모 섹션에 반영한다", () => {
    const document = buildStudentReportDocument({
      member,
      records,
      detailsById,
      memos,
      settings: createDefaultStudentReportSettings(member.name),
    });

    expect(document.meta.some((item) => item.label === "운영 메모")).toBe(true);
    expect(
      document.meta.find((item) => item.label === "운영 메모")?.value,
    ).toBe("2건");
    expect(
      document.sections.some((section) => section.title === "최근 운영 메모"),
    ).toBe(true);
    expect(
      document.sections.find((section) => section.title === "최근 운영 메모")
        ?.bullets[0],
    ).toContain("과제 제출 루틴 확인이 필요함");
  });
});
