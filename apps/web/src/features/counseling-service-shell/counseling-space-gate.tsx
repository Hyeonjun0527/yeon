"use client";

import { FileUp, FolderPlus } from "lucide-react";

type CounselingSpaceGateVariant = "home" | "student-management";

type CounselingSpaceGateCopy = {
  badge: string;
  titleLines: [string, string];
  description: string;
  importDescription: string;
  blankDescription: string;
  whyTitle: string;
  reasons: string[];
};

const SPACE_GATE_COPY: Record<
  CounselingSpaceGateVariant,
  CounselingSpaceGateCopy
> = {
  home: {
    badge: "상담 워크스페이스 시작",
    titleLines: ["먼저 스페이스를 만들고", "그 안에서 상담을 시작하세요"],
    description:
      "상담 기록은 스페이스 안에 쌓입니다. 먼저 스페이스를 만들면 학생, 원문, 구조화 요약, 후속 리포트를 한 단위로 관리할 수 있습니다.",
    importDescription:
      "엑셀·CSV·파일에서 학생 데이터를 가져와 바로 상담 워크스페이스를 시작합니다.",
    blankDescription:
      "직접 이름과 기간을 정하고, 필요한 학생과 상담 기록을 차근차근 쌓아갑니다.",
    whyTitle: "왜 먼저 스페이스를 만드나요?",
    reasons: [
      "상담 기록과 학생 연결이 스페이스 기준으로 정리됩니다.",
      "원문, 요약, 리포트를 같은 운영 단위에서 누적할 수 있습니다.",
      "나중에 기수/반/프로그램별로 분리 운영하기 쉬워집니다.",
    ],
  },
  "student-management": {
    badge: "학생 관리 워크스페이스 시작",
    titleLines: ["먼저 스페이스를 만들고", "그 안에서 학생 관리를 시작하세요"],
    description:
      "학생 목록, 출석·과제 보드, 공개 체크인 세션은 모두 스페이스 안에서 관리됩니다. 먼저 스페이스를 만들면 운영 공간을 나눠 더 안정적으로 관리할 수 있습니다.",
    importDescription:
      "엑셀·CSV·파일에서 학생 데이터를 가져와 바로 학생 관리 워크스페이스를 시작합니다.",
    blankDescription:
      "직접 공간을 만든 뒤 수강생을 하나씩 등록하고, 필요한 탭과 항목을 차근차근 구성합니다.",
    whyTitle: "왜 학생관리도 먼저 스페이스를 만드나요?",
    reasons: [
      "수강생 목록과 출석·과제 보드가 스페이스 기준으로 정리됩니다.",
      "기수/반/프로그램 단위로 운영 공간을 나눠 관리하기 쉬워집니다.",
      "학생 추가, 커스텀 탭, 공개 체크인 세션을 같은 공간에서 이어갈 수 있습니다.",
    ],
  },
};

interface CounselingSpaceGateProps {
  onCreateBlankSpace: () => void;
  onImportSpace: () => void;
  variant?: CounselingSpaceGateVariant;
}

export function CounselingSpaceGate({
  onCreateBlankSpace,
  onImportSpace,
  variant = "home",
}: CounselingSpaceGateProps) {
  const copy = SPACE_GATE_COPY[variant];

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-surface px-6 py-7 shadow-[0_24px_64px_rgba(0,0,0,0.28)] md:px-8 md:py-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {copy.badge}
          </p>
          <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em] text-text md:text-[34px]">
            {copy.titleLines[0]}
            <br className="hidden md:block" />
            {copy.titleLines[1]}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-text-secondary md:text-[15px]">
            {copy.description}
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            className="flex min-h-[148px] flex-col items-start justify-between rounded-2xl border border-accent-border bg-accent px-5 py-5 text-left text-white transition-[transform,opacity] duration-150 hover:opacity-95"
            onClick={onImportSpace}
          >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/12">
              <FileUp size={20} />
            </div>
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.02em]">
                파일 가져와 스페이스 만들기
              </div>
              <p className="mt-2 text-sm leading-6 text-white/80">
                {copy.importDescription}
              </p>
            </div>
          </button>

          <button
            type="button"
            className="flex min-h-[148px] flex-col items-start justify-between rounded-2xl border border-border bg-surface-2 px-5 py-5 text-left text-text transition-colors duration-150 hover:border-border-light hover:bg-surface-3"
            onClick={onCreateBlankSpace}
          >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-dim text-accent">
              <FolderPlus size={20} />
            </div>
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.02em]">
                빈 스페이스 만들기
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {copy.blankDescription}
              </p>
            </div>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface-2 px-5 py-4">
          <div className="text-[12px] font-semibold text-text">
            {copy.whyTitle}
          </div>
          <ul className="mt-3 space-y-2 text-[13px] leading-6 text-text-secondary">
            {copy.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
