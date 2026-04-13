import type { ImportPreview } from "../types";
import { summaryText } from "./import-helpers";

type RemovableCoreFieldKey = "email" | "phone" | "status";
type RefineFieldTarget =
  | {
      key: RemovableCoreFieldKey;
      label: string;
      kind: "core";
      aliases: string[];
    }
  | {
      key: string;
      label: string;
      kind: "custom";
      aliases: string[];
    };

export interface LocalPreviewRefinementResult {
  preview: ImportPreview;
  message: string;
  removedColumns: string[];
}

const REMOVE_INTENT_TOKENS = [
  "제거",
  "삭제",
  "없애",
  "없어도",
  "없어도돼",
  "없어도되",
  "필요없",
  "필요 없",
  "필요가없",
  "필요가 없",
  "빼줘",
  "빼주",
  "빼고",
  "빼",
  "제외",
] as const;

const COLUMN_CONTEXT_TOKENS = ["컬럼", "열", "필드", "항목"] as const;

const CORE_FIELD_TARGETS: RefineFieldTarget[] = [
  {
    key: "email",
    label: "이메일",
    kind: "core",
    aliases: ["이메일", "email", "메일"],
  },
  {
    key: "phone",
    label: "연락처",
    kind: "core",
    aliases: ["연락처", "전화번호", "휴대폰", "phone"],
  },
  {
    key: "status",
    label: "상태",
    kind: "core",
    aliases: ["상태", "수강상태", "status"],
  },
];

function normalizeInstructionText(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/[\s"'`.,!?()[\]{}]/g, "");
}

function buildRefineTargets(preview: ImportPreview): RefineFieldTarget[] {
  const customTargets = new Map<string, RefineFieldTarget>();

  preview.cohorts.forEach((cohort) => {
    cohort.students.forEach((student) => {
      Object.keys(student.customFields ?? {}).forEach((rawKey) => {
        const key = rawKey.trim();
        if (!key || customTargets.has(key)) return;
        customTargets.set(key, {
          key,
          label: key,
          kind: "custom",
          aliases: [key],
        });
      });
    });
  });

  return [...CORE_FIELD_TARGETS, ...customTargets.values()];
}

function hasRemoveIntent(instruction: string) {
  const normalizedInstruction = normalizeInstructionText(instruction);
  return REMOVE_INTENT_TOKENS.some((token) =>
    normalizedInstruction.includes(normalizeInstructionText(token)),
  );
}

function hasColumnContext(instruction: string) {
  const normalizedInstruction = normalizeInstructionText(instruction);
  return COLUMN_CONTEXT_TOKENS.some((token) =>
    normalizedInstruction.includes(normalizeInstructionText(token)),
  );
}

function matchRemovalTargets(
  preview: ImportPreview,
  instruction: string,
): RefineFieldTarget[] {
  if (!hasRemoveIntent(instruction)) {
    return [];
  }

  const normalizedInstruction = normalizeInstructionText(instruction);
  const instructionHasColumnContext = hasColumnContext(instruction);

  return buildRefineTargets(preview)
    .filter((target) =>
      target.aliases.some((alias) =>
        normalizedInstruction.includes(normalizeInstructionText(alias)),
      ),
    )
    .filter((target) => instructionHasColumnContext || target.kind === "custom")
    .sort((left, right) => right.label.length - left.label.length);
}

export function applyLocalPreviewRefinement(
  preview: ImportPreview,
  instruction: string,
): LocalPreviewRefinementResult | null {
  const matchedTargets = matchRemovalTargets(preview, instruction);

  if (matchedTargets.length === 0) {
    return null;
  }

  const uniqueTargets = Array.from(
    new Map(matchedTargets.map((target) => [target.key, target])).values(),
  );
  let changed = false;

  const nextPreview: ImportPreview = {
    cohorts: preview.cohorts.map((cohort) => ({
      ...cohort,
      students: cohort.students.map((student) => {
        let nextStudent = student;

        uniqueTargets.forEach((target) => {
          if (target.kind === "custom") {
            if (
              !student.customFields ||
              !(target.key in student.customFields)
            ) {
              return;
            }

            const nextCustomFields = { ...student.customFields };
            delete nextCustomFields[target.key];
            changed = true;
            nextStudent =
              nextStudent === student ? { ...student } : { ...nextStudent };
            nextStudent.customFields =
              Object.keys(nextCustomFields).length > 0
                ? nextCustomFields
                : null;
            return;
          }

          if (student[target.key] == null) {
            return;
          }

          changed = true;
          nextStudent =
            nextStudent === student
              ? { ...student, [target.key]: null }
              : { ...nextStudent, [target.key]: null };
        });

        return nextStudent;
      }),
    })),
  };

  const removedColumns = uniqueTargets.map((target) => target.label);
  const customLabels = uniqueTargets
    .filter((target) => target.kind === "custom")
    .map((target) => target.label);
  const coreLabels = uniqueTargets
    .filter((target) => target.kind === "core")
    .map((target) => target.label);

  const buildMessage = (currentPreview: ImportPreview) => {
    const parts: string[] = [];

    if (customLabels.length > 0) {
      parts.push(`${customLabels.join(", ")} 커스텀 컬럼을 제거했습니다.`);
    }

    if (coreLabels.length > 0) {
      parts.push(
        `${coreLabels.join(", ")} 고정 필드는 컬럼 구조를 유지한 채 값만 비웠습니다.`,
      );
    }

    if (parts.length === 0) {
      return `요청을 검토했지만 반영할 변경이 없었습니다. (${summaryText(currentPreview)})`;
    }

    return `${parts.join(" ")} (${summaryText(currentPreview)})`;
  };

  if (!changed) {
    return {
      preview,
      removedColumns,
      message: `${removedColumns.join(", ")} 관련 요청은 이미 반영된 상태입니다. (${summaryText(preview)})`,
    };
  }

  return {
    preview: nextPreview,
    removedColumns,
    message: buildMessage(nextPreview),
  };
}
