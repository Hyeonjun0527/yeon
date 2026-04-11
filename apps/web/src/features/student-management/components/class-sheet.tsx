"use client";

import { X } from "lucide-react";

interface ClassSheetProps {
  mode: "create" | "edit" | null;
  form: {
    name: string;
    subject: string;
    instructor: string;
    schedule: string;
    capacity: string;
    year: string;
  };
  onUpdateField: (
    field: "name" | "subject" | "instructor" | "schedule" | "capacity" | "year",
    value: string,
  ) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ClassSheet({
  mode,
  form,
  onUpdateField,
  onSubmit,
  onClose,
}: ClassSheetProps) {
  if (!mode) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100]"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 bottom-0 w-[480px] max-w-full bg-surface border-l border-border shadow-[-4px_0_24px_rgba(0,0,0,0.3)] z-[101] flex flex-col">
        <div className="flex items-center justify-between py-5 px-6 border-b border-border">
          <h2 className="text-lg font-bold text-text">
            {mode === "create" ? "코호트 추가" : "코호트 수정"}
          </h2>
          <button
            className="p-1 border-none bg-transparent text-text-dim cursor-pointer flex transition-colors duration-150 hover:text-text-secondary"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-text-secondary mb-3">
              기본 정보
            </h3>

            <div className="mb-3">
              <label className="block text-[13px] font-medium text-text-dim mb-1">
                코호트 이름 *
              </label>
              <input
                className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
                value={form.name}
                onChange={(e) => onUpdateField("name", e.target.value)}
                placeholder="예: 웹개발 3기"
              />
            </div>

            <div className="mb-3">
              <label className="block text-[13px] font-medium text-text-dim mb-1">
                트랙 (과목)
              </label>
              <input
                className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
                value={form.subject}
                onChange={(e) => onUpdateField("subject", e.target.value)}
                placeholder="예: 풀스택 웹개발"
              />
            </div>

            <div className="mb-3">
              <label className="block text-[13px] font-medium text-text-dim mb-1">
                담당 멘토
              </label>
              <input
                className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
                value={form.instructor}
                onChange={(e) => onUpdateField("instructor", e.target.value)}
                placeholder="예: 김태호 멘토"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-text-secondary mb-3">
              일정 및 정원
            </h3>

            <div className="mb-3">
              <label className="block text-[13px] font-medium text-text-dim mb-1">
                스케줄
              </label>
              <input
                className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
                value={form.schedule}
                onChange={(e) => onUpdateField("schedule", e.target.value)}
                placeholder="예: 월~금 09:00-18:00"
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="mb-3 flex-1">
                <label className="block text-[13px] font-medium text-text-dim mb-1">
                  정원
                </label>
                <input
                  className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => onUpdateField("capacity", e.target.value)}
                />
              </div>

              <div className="mb-3 flex-1">
                <label className="block text-[13px] font-medium text-text-dim mb-1">
                  년도
                </label>
                <input
                  className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
                  type="number"
                  value={form.year}
                  onChange={(e) => onUpdateField("year", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="py-4 px-6 border-t border-border flex justify-end gap-2">
          <button
            className="py-2 px-4 border border-border rounded-lg bg-surface-2 text-text-secondary text-sm cursor-pointer transition-[background] duration-150 hover:bg-surface-3"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="py-2 px-5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            onClick={onSubmit}
            disabled={!form.name.trim()}
          >
            {mode === "create" ? "추가" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}
