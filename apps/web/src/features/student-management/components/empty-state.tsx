"use client";

import { UserPlus } from "lucide-react";
import listStyles from "../student-list.module.css";

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className={listStyles.emptyState}>
      <UserPlus size={48} className={listStyles.emptyIcon} />
      <p className={listStyles.emptyTitle}>아직 등록된 학생이 없습니다</p>
      <p className={listStyles.emptyDesc}>
        첫 학생을 등록하고 상담 기록을 관리해보세요
      </p>
      <button className={listStyles.addButton} onClick={onAdd}>
        <UserPlus size={16} />
        학생 등록하기
      </button>
    </div>
  );
}
