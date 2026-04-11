import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindRiskRecordsByMemberIds = vi.fn();

vi.mock("../counseling-records-repository", async () => {
  const actual = await vi.importActual<
    typeof import("../counseling-records-repository")
  >("../counseling-records-repository");

  return {
    ...actual,
    findRiskRecordsByMemberIds: (...args: unknown[]) =>
      mockFindRiskRecordsByMemberIds(...args),
  };
});

import {
  attachMemberRiskProfiles,
  buildMemberRiskProfile,
} from "../member-risk-service";

type RiskRecord = Parameters<
  typeof buildMemberRiskProfile
>[0]["records"][number];

const makeRiskRecord = (overrides: Partial<RiskRecord> = {}): RiskRecord => ({
  memberId: "member-1",
  analysisResult: {
    summary: "학습 리듬이 흔들리고 있습니다.",
    member: {
      name: "홍길동",
      traits: ["성실함"],
      emotion: "불안",
    },
    issues: [
      {
        title: "과제 지연",
        detail: "최근 과제 제출이 밀렸습니다.",
        timestamp: null,
      },
    ],
    keywords: ["과제", "리듬"],
    actions: {
      mentor: ["주간 점검"],
      member: ["과제 계획 작성"],
      nextSession: ["다음 주 진행 확인"],
    },
  },
  audioStoragePath: "records/member-1/audio.webm",
  createdAt: new Date("2026-04-12T10:00:00.000Z"),
  ...overrides,
});

describe("member-risk-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("placeholder 오디오는 제외하고 manual fallback을 유지한다", () => {
    const profile = buildMemberRiskProfile({
      records: [
        makeRiskRecord({
          audioStoragePath: "local://demo/placeholder-record",
        }),
      ],
      initialRiskLevel: "medium",
    });

    expect(profile.counselingRecordCount).toBe(0);
    expect(profile.aiRiskLevel).toBeNull();
    expect(profile.riskSource).toBe("manual");
  });

  it("riskAssessment가 있으면 signals를 dedupe해서 최대 3개만 사용한다", () => {
    const profile = buildMemberRiskProfile({
      records: [
        makeRiskRecord({
          analysisResult: {
            summary: "고위험 징후가 있습니다.",
            member: {
              name: "홍길동",
              traits: ["책임감"],
              emotion: "불안",
            },
            issues: [],
            keywords: ["불안"],
            actions: {
              mentor: [],
              member: [],
              nextSession: [],
            },
            riskAssessment: {
              level: "high",
              basis: "  장기 지연과 결석이 반복됩니다.  ",
              signals: ["결석", "결석", "장기 지연", "번아웃"],
            },
          },
        }),
      ],
    });

    expect(profile.aiRiskLevel).toBe("high");
    expect(profile.aiRiskSummary).toBe("장기 지연과 결석이 반복됩니다.");
    expect(profile.aiRiskSignals).toEqual(["결석", "장기 지연", "번아웃"]);
  });

  it("legacy 분석 결과는 패턴 기반으로 위험도를 추론한다", () => {
    const profile = buildMemberRiskProfile({
      records: [
        makeRiskRecord({
          analysisResult: {
            summary: "최근 번아웃과 장기 지연이 관찰됩니다.",
            member: {
              name: "홍길동",
              traits: ["몰입형"],
              emotion: "무기력",
            },
            issues: [
              {
                title: "장기 지연",
                detail: "과제와 출석 모두 흔들리고 있습니다.",
                timestamp: null,
              },
            ],
            keywords: ["번아웃", "지연"],
            actions: {
              mentor: ["즉시 상담"],
              member: ["학습량 조정"],
              nextSession: ["위험도 재평가"],
            },
          },
        }),
      ],
    });

    expect(profile.aiRiskLevel).toBe("high");
    expect(profile.riskSource).toBe("counseling_ai");
  });

  it("attachMemberRiskProfiles는 member별로 프로필을 붙인다", async () => {
    mockFindRiskRecordsByMemberIds.mockResolvedValue([
      makeRiskRecord({ memberId: "member-1" }),
      makeRiskRecord({
        memberId: "member-2",
        analysisResult: {
          summary: "안정적입니다.",
          member: {
            name: "김영희",
            traits: ["꾸준함"],
            emotion: "안정",
          },
          issues: [],
          keywords: [],
          actions: {
            mentor: [],
            member: [],
            nextSession: [],
          },
          riskAssessment: {
            level: "low",
            basis: "현재 위험 신호가 뚜렷하지 않습니다.",
            signals: ["안정"],
          },
        },
      }),
    ]);

    const result = await attachMemberRiskProfiles("user-1", [
      { id: "member-1", initialRiskLevel: null, name: "홍길동" },
      { id: "member-2", initialRiskLevel: null, name: "김영희" },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.aiRiskLevel).toBe("high");
    expect(result[1]?.aiRiskLevel).toBe("low");
    expect(mockFindRiskRecordsByMemberIds).toHaveBeenCalledWith("user-1", [
      "member-1",
      "member-2",
    ]);
  });
});
