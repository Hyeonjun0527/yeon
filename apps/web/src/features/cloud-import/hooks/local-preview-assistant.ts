import type { ImportPreview } from "../types";

interface LocalPreviewAnswerResult {
  message: string;
}

const QUESTION_TOKENS = [
  "?",
  "가능",
  "불가능",
  "되나",
  "되나요",
  "가능하니",
  "가능한가",
  "할수있",
  "할 수 있",
  "맞아",
  "맞나",
  "어떻게",
  "왜",
  "질문",
] as const;

const REMOVE_INTENT_TOKENS = [
  "제거",
  "삭제",
  "없애",
  "필요없",
  "필요 없",
  "필요가없",
  "필요가 없",
  "빼줘",
  "빼고",
  "제외",
] as const;

const COLUMN_CONTEXT_TOKENS = ["컬럼", "열", "필드", "항목"] as const;

function normalizeInstructionText(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/[\s"'`.,!()[\]{}]/g, "");
}

function isQuestionInstruction(instruction: string) {
  const normalizedInstruction = normalizeInstructionText(instruction);
  return QUESTION_TOKENS.some((token) =>
    normalizedInstruction.includes(normalizeInstructionText(token)),
  );
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

function hasAnyAlias(instruction: string, aliases: string[]) {
  const normalizedInstruction = normalizeInstructionText(instruction);
  return aliases.some((alias) =>
    normalizedInstruction.includes(normalizeInstructionText(alias)),
  );
}

function hasCustomField(preview: ImportPreview, targetKey: string) {
  return preview.cohorts.some((cohort) =>
    cohort.students.some(
      (student) => (student.customFields?.[targetKey] ?? null) !== null,
    ),
  );
}

export function answerLocalPreviewQuestion(
  preview: ImportPreview,
  instruction: string,
): LocalPreviewAnswerResult | null {
  if (!isQuestionInstruction(instruction)) {
    return null;
  }

  const asksColumnPolicy =
    hasRemoveIntent(instruction) && hasColumnContext(instruction);

  if (!asksColumnPolicy) {
    return null;
  }

  if (hasAnyAlias(instruction, ["이름", "name"])) {
    return {
      message:
        "이름 컬럼은 제거할 수 없습니다. 가져오기에서 각 수강생을 식별하려면 이름 값이 필요해서, 이름 필드는 source of truth로 유지됩니다. 대신 이메일·연락처·상태 같은 고정 필드는 값을 비울 수 있고, 전공처럼 커스텀 컬럼은 통째로 제거할 수 있습니다.",
    };
  }

  if (hasAnyAlias(instruction, ["이메일", "email", "메일"])) {
    return {
      message:
        "이메일은 고정 필드라 컬럼 구조 자체를 없애기보다 값을 비우는 방식으로 처리합니다. 검토 표의 공통 구조는 유지하고, 각 수강생의 이메일 값만 null로 정리하는 정책입니다.",
    };
  }

  if (hasAnyAlias(instruction, ["연락처", "전화번호", "휴대폰", "phone"])) {
    return {
      message:
        "연락처도 고정 필드라 컬럼 자체를 없애기보다 값을 비우는 방식으로 처리합니다. 표의 기본 골격은 유지하고, 각 수강생 연락처 값만 지우는 정책입니다.",
    };
  }

  if (hasAnyAlias(instruction, ["상태", "수강상태", "status"])) {
    return {
      message:
        "상태는 고정 필드라 컬럼 자체 제거 대신 값 비우기만 가능합니다. 가져오기 검토 단계에서 공통 필드 구조를 유지해야 해서, 값만 null로 정리하는 방식으로 반영합니다.",
    };
  }

  for (const cohort of preview.cohorts) {
    for (const student of cohort.students) {
      for (const key of Object.keys(student.customFields ?? {})) {
        if (!hasAnyAlias(instruction, [key])) continue;
        if (!hasCustomField(preview, key)) continue;
        return {
          message: `${key}처럼 커스텀 컬럼은 제거할 수 있습니다. 요청하면 모든 수강생의 해당 필드를 통째로 삭제해서 표에서도 사라지게 처리합니다.`,
        };
      }
    }
  }

  return null;
}
