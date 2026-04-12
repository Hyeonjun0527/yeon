"use client";

import { FileUp, FolderPlus } from "lucide-react";

interface HomeSpaceGateProps {
  onCreateBlankSpace: () => void;
  onImportSpace: () => void;
}

export function HomeSpaceGate({
  onCreateBlankSpace,
  onImportSpace,
}: HomeSpaceGateProps) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-surface px-6 py-7 shadow-[0_24px_64px_rgba(0,0,0,0.28)] md:px-8 md:py-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            상담 워크스페이스 시작
          </p>
          <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em] text-text md:text-[34px]">
            먼저 스페이스를 만들고
            <br className="hidden md:block" />그 안에서 상담을 시작하세요
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-text-secondary md:text-[15px]">
            상담 기록은 스페이스 안에 쌓입니다. 먼저 스페이스를 만들면 학생,
            원문, 구조화 요약, 후속 리포트를 한 단위로 관리할 수 있습니다.
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
                엑셀·CSV·파일에서 학생 데이터를 가져와 바로 상담 워크스페이스를
                시작합니다.
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
                직접 이름과 기간을 정하고, 필요한 학생과 상담 기록을 차근차근
                쌓아갑니다.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface-2 px-5 py-4">
          <div className="text-[12px] font-semibold text-text">
            왜 먼저 스페이스를 만드나요?
          </div>
          <ul className="mt-3 space-y-2 text-[13px] leading-6 text-text-secondary">
            <li>• 상담 기록과 학생 연결이 스페이스 기준으로 정리됩니다.</li>
            <li>
              • 원문, 요약, 리포트를 같은 운영 단위에서 누적할 수 있습니다.
            </li>
            <li>• 나중에 기수/반/프로그램별로 분리 운영하기 쉬워집니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
