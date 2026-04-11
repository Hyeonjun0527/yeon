import {
  type AnalysisResult,
  analysisResultSchema,
} from "@yeon/api-contract/counseling-records";

import {
  findRiskRecordsByMemberIds,
  isPlaceholderAudioStoragePath,
  type MemberRiskRecordRow,
} from "./counseling-records-repository";

type RiskLevel = "low" | "medium" | "high";

type MemberRiskSource = "counseling_ai" | "manual" | null;

export type MemberRiskProfile = {
  aiRiskLevel: RiskLevel | null;
  aiRiskSummary: string | null;
  aiRiskSignals: string[];
  riskSource: MemberRiskSource;
  counselingRecordCount: number;
  lastCounselingAt: string | null;
};

const RISK_LEVEL_SCORE: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const HIGH_RISK_PATTERNS = [
  /중도[\s-]*포기/,
  /이탈/,
  /그만두/,
  /번아웃/,
  /무기력/,
  /심한\s*불안/,
  /결석/,
  /장기\s*지연/,
  /완전히\s*놓치/,
  /자신감\s*저하/,
];

const MEDIUM_RISK_PATTERNS = [
  /과제\s*지연/,
  /집중/,
  /걱정/,
  /부담/,
  /질문\s*없/,
  /리듬/,
  /루틴/,
  /흔들리/,
  /지각/,
  /참여\s*저하/,
];

function toIsoStringOrNull(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function parseAnalysisResult(
  record: Pick<MemberRiskRecordRow, "analysisResult">,
): AnalysisResult | null {
  const parsed = analysisResultSchema.safeParse(record.analysisResult);
  return parsed.success ? parsed.data : null;
}

function dedupeNonEmpty(values: Array<string | null | undefined>) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function inferLegacyRiskLevel(analysis: AnalysisResult): RiskLevel {
  const corpus = [
    analysis.summary,
    analysis.member.emotion,
    ...analysis.issues.flatMap((issue) => [issue.title, issue.detail]),
    ...analysis.actions.mentor,
    ...analysis.actions.member,
    ...analysis.actions.nextSession,
    ...analysis.keywords,
  ]
    .join(" ")
    .toLowerCase();

  const highMatches = HIGH_RISK_PATTERNS.filter((pattern) =>
    pattern.test(corpus),
  ).length;
  const mediumMatches = MEDIUM_RISK_PATTERNS.filter((pattern) =>
    pattern.test(corpus),
  ).length;

  if (highMatches > 0 || mediumMatches >= 3) {
    return "high";
  }

  if (mediumMatches > 0 || analysis.issues.length > 0) {
    return "medium";
  }

  return "low";
}

function deriveRiskFromAnalysis(analysis: AnalysisResult) {
  if (analysis.riskAssessment) {
    return {
      level: analysis.riskAssessment.level,
      basis: analysis.riskAssessment.basis.trim(),
      signals: dedupeNonEmpty(analysis.riskAssessment.signals).slice(0, 3),
    };
  }

  return {
    level: inferLegacyRiskLevel(analysis),
    basis:
      analysis.issues[0]?.detail?.trim() ||
      analysis.summary.trim() ||
      "상담 내역 기반 위험 신호를 다시 확인할 필요가 있습니다.",
    signals: dedupeNonEmpty([
      ...analysis.keywords,
      ...analysis.issues.map((issue) => issue.title),
    ]).slice(0, 3),
  };
}

function pickRepresentativeRisk(records: MemberRiskRecordRow[]) {
  const analyzed = records
    .map((record) => {
      const analysis = parseAnalysisResult(record);

      if (!analysis) {
        return null;
      }

      const derived = deriveRiskFromAnalysis(analysis);

      return {
        createdAt: record.createdAt,
        ...derived,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 3);

  if (analyzed.length === 0) {
    return null;
  }

  return [...analyzed].sort((left, right) => {
    const scoreGap =
      RISK_LEVEL_SCORE[right.level] - RISK_LEVEL_SCORE[left.level];

    if (scoreGap !== 0) {
      return scoreGap;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
}

export function buildMemberRiskProfile(options: {
  records: MemberRiskRecordRow[];
  initialRiskLevel?: string | null;
}): MemberRiskProfile {
  const realRecords = options.records.filter(
    (record) => !isPlaceholderAudioStoragePath(record.audioStoragePath),
  );
  const sorted = [...realRecords].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const representativeRisk = pickRepresentativeRisk(sorted);

  return {
    aiRiskLevel: representativeRisk?.level ?? null,
    aiRiskSummary: representativeRisk?.basis ?? null,
    aiRiskSignals: representativeRisk?.signals ?? [],
    riskSource: representativeRisk
      ? "counseling_ai"
      : options.initialRiskLevel
        ? "manual"
        : null,
    counselingRecordCount: sorted.length,
    lastCounselingAt: toIsoStringOrNull(sorted[0]?.createdAt),
  };
}

export async function getMemberRiskProfile(options: {
  userId: string;
  memberId: string;
  initialRiskLevel?: string | null;
}) {
  const groupedProfiles = await getMemberRiskProfilesByMemberIds(
    options.userId,
    [
      {
        id: options.memberId,
        initialRiskLevel: options.initialRiskLevel ?? null,
      },
    ],
  );

  return (
    groupedProfiles.get(options.memberId) ?? {
      aiRiskLevel: null,
      aiRiskSummary: null,
      aiRiskSignals: [],
      riskSource: options.initialRiskLevel ? "manual" : null,
      counselingRecordCount: 0,
      lastCounselingAt: null,
    }
  );
}

async function getMemberRiskProfilesByMemberIds<
  T extends { id: string; initialRiskLevel?: string | null },
>(userId: string, members: T[]) {
  const memberIds = members.map((member) => member.id);
  const records = await findRiskRecordsByMemberIds(userId, memberIds);
  const recordsByMemberId = new Map<string, MemberRiskRecordRow[]>();

  for (const record of records) {
    if (!record.memberId) {
      continue;
    }

    const group = recordsByMemberId.get(record.memberId);
    if (group) {
      group.push(record);
    } else {
      recordsByMemberId.set(record.memberId, [record]);
    }
  }

  return new Map(
    members.map((member) => [
      member.id,
      buildMemberRiskProfile({
        records: recordsByMemberId.get(member.id) ?? [],
        initialRiskLevel: member.initialRiskLevel ?? null,
      }),
    ]),
  );
}

export async function attachMemberRiskProfiles<
  T extends {
    id: string;
    initialRiskLevel?: string | null;
  },
>(userId: string, members: T[]) {
  const profilesByMemberId = await getMemberRiskProfilesByMemberIds(
    userId,
    members,
  );

  return members.map((member) => ({
    ...member,
    ...profilesByMemberId.get(member.id),
  }));
}
