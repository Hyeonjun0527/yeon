"use client";

import { UserPlus } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
      <UserPlus size={48} className="text-text-dim mb-4" />
      <p className="text-lg font-semibold text-text mb-2">
        아직 등록된 수강생이 없습니다
      </p>
      <p className="text-sm text-text-secondary mb-6">
        첫 수강생을 등록하고 상담 기록을 관리해보세요
      </p>
      <button
        className="flex items-center gap-1.5 py-2 px-4 bg-accent text-white border-none rounded-sm text-sm font-semibold cursor-pointer transition-[opacity,box-shadow] duration-150 hover:opacity-90 hover:shadow-[0_8px_32px_rgba(129,140,248,0.25)]"
        onClick={onAdd}
      >
        <UserPlus size={16} />
        수강생 등록하기
      </button>
    </div>
  );
}
