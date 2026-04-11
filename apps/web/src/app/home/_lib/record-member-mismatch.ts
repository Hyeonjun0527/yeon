import type { RecordItem } from "./types";

export interface RecordMemberMismatchWarning {
  title: string;
  description: string;
  evidence: string[];
  detectedMemberName: string | null;
}

type NamedMember = {
  id: string;
  name: string;
};

function normalizeName(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

function hasNameMention(text: string, name: string) {
  const normalizedText = normalizeName(text);
  const normalizedName = normalizeName(name);
  if (!normalizedName) return false;
  return normalizedText.includes(normalizedName);
}

export function detectRecordMemberMismatch(
  record: RecordItem | null,
  members: NamedMember[],
  targetMemberId: string | null,
): RecordMemberMismatchWarning | null {
  if (!record || !targetMemberId) return null;

  const targetMember = members.find((member) => member.id === targetMemberId);
  if (!targetMember) return null;

  const transcriptText = record.transcript
    .map((segment) => segment.text)
    .join(" ");
  const targetMentioned = hasNameMention(transcriptText, targetMember.name);

  const analysisName = record.analysisResult?.member.name?.trim() || "";
  const analysisNameNormalized = normalizeName(analysisName);
  const targetNameNormalized = normalizeName(targetMember.name);
  const recordStudentNameNormalized = normalizeName(record.studentName);

  const otherMentionedMember = members.find(
    (member) =>
      member.id !== targetMemberId &&
      hasNameMention(transcriptText, member.name),
  );

  const analysisMatchedOtherMember = members.find(
    (member) =>
      member.id !== targetMemberId &&
      analysisNameNormalized.length > 0 &&
      normalizeName(member.name) === analysisNameNormalized,
  );

  const evidence: string[] = [];
  let detectedMemberName: string | null = null;

  if (analysisMatchedOtherMember) {
    detectedMemberName = analysisMatchedOtherMember.name;
    evidence.push(
      `AI 분석의 수강생 이름이 "${analysisMatchedOtherMember.name}"로 읽혔습니다.`,
    );
  }

  if (otherMentionedMember && !targetMentioned) {
    detectedMemberName = detectedMemberName ?? otherMentionedMember.name;
    evidence.push(
      `전사 원문에 "${otherMentionedMember.name}" 이름이 보이지만 현재 연결 대상 "${targetMember.name}" 이름은 확인되지 않습니다.`,
    );
  }

  if (
    record.studentName &&
    recordStudentNameNormalized.length > 0 &&
    recordStudentNameNormalized !== targetNameNormalized
  ) {
    evidence.push(
      `현재 기록의 수강생 표시값은 "${record.studentName}"인데 연결 대상은 "${targetMember.name}"입니다.`,
    );
  }

  if (evidence.length === 0) return null;

  return {
    title: "잘못된 녹음파일일 수 있습니다",
    description:
      detectedMemberName !== null
        ? `현재 선택한 수강생보다 "${detectedMemberName}" 관련 녹음일 가능성이 보여요. 연결 전 한 번 더 확인해 주세요.`
        : "현재 선택한 수강생과 녹음 내용의 이름 신호가 다를 수 있습니다. 연결 전 한 번 더 확인해 주세요.",
    evidence,
    detectedMemberName,
  };
}
