"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FolderPlus, FileUp, LayoutTemplate } from "lucide-react";
import type { Space } from "../_hooks/use-current-space";
import { CloudImportInline } from "@/features/cloud-import/components/cloud-import-inline";

type Step =
  | { kind: "choose" }
  | { kind: "template" }
  | { kind: "form" }
  | { kind: "import" };

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface CreateSpaceModalProps {
  onClose: () => void;
  onCreated: (space: Space) => void;
}

export function CreateSpaceModal({
  onClose,
  onCreated,
}: CreateSpaceModalProps) {
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const { data: templatesData, isPending: templatesLoading } = useQuery({
    queryKey: ["space-templates"],
    queryFn: async () => {
      const r = await fetch("/api/v1/space-templates");
      if (!r.ok) return { templates: [] as TemplateOption[] };
      return r.json() as Promise<{ templates: TemplateOption[] }>;
    },
    enabled: step.kind === "template",
  });
  const templates = templatesData
    ? templatesData.templates
    : ([] as TemplateOption[]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("스페이스 이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "스페이스를 만들지 못했습니다.");
      }
      const data = (await res.json()) as { space: Space };

      if (selectedTemplateId) {
        await fetch(`/api/v1/spaces/${data.space.id}/apply-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplateId }),
        }).catch(() => {});
      }

      onCreated(data.space);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "스페이스를 만들지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (step.kind === "import") {
    return (
      <div
        className="fixed inset-0 z-[300] p-3"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="h-full w-full bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <button
              className="text-xs text-text-dim hover:text-text border-none bg-transparent cursor-pointer px-0 py-0"
              onClick={() => setStep({ kind: "choose" })}
            >
              ← 뒤로
            </button>
            <button
              className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-text-dim hover:text-text hover:bg-surface-3 cursor-pointer"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            <CloudImportInline
              expanded
              onClose={onClose}
              onImportComplete={onClose}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ width: 480 }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[14px] font-semibold text-text">
            {step.kind === "choose" && "새 스페이스 만들기"}
            {step.kind === "template" && "템플릿 선택"}
            {step.kind === "form" && "스페이스 정보 입력"}
          </span>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-text-dim hover:text-text hover:bg-surface-3 cursor-pointer"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {step.kind === "choose" && (
          <div className="p-5 space-y-3">
            <p className="text-xs text-text-dim mb-4">
              스페이스를 어떻게 만들까요?
            </p>

            <button
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-lg border border-border bg-surface-3 hover:border-accent hover:bg-accent-dim text-left transition-colors cursor-pointer font-[inherit]"
              onClick={() => setStep({ kind: "template" })}
            >
              <FolderPlus
                size={18}
                className="text-accent flex-shrink-0 mt-0.5"
              />
              <div>
                <div className="text-sm font-semibold text-text">
                  직접 만들기
                </div>
                <div className="text-xs text-text-dim mt-0.5">
                  이름과 기간을 직접 입력해 스페이스를 생성합니다
                </div>
              </div>
            </button>

            <button
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-lg border border-border bg-surface-3 hover:border-accent hover:bg-accent-dim text-left transition-colors cursor-pointer font-[inherit]"
              onClick={() => setStep({ kind: "import" })}
            >
              <FileUp size={18} className="text-accent flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-text">
                  파일에서 가져오기
                </div>
                <div className="text-xs text-text-dim mt-0.5">
                  스프레드시트나 클라우드 파일에서 수강생 목록을 불러옵니다
                </div>
              </div>
            </button>
          </div>
        )}

        {step.kind === "template" && (
          <div className="p-5">
            <p className="text-xs text-text-dim mb-3">
              템플릿을 선택하면 탭과 커스텀 필드가 자동으로 설정됩니다.
            </p>

            {templatesLoading ? (
              <div className="py-6 text-center text-xs text-text-dim">
                불러오는 중…
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                {/* 템플릿 없음 옵션 */}
                <button
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg border text-left transition-colors cursor-pointer font-[inherit] ${
                    selectedTemplateId === null
                      ? "border-accent bg-accent/5"
                      : "border-border bg-surface-3 hover:border-border-light"
                  }`}
                  onClick={() => setSelectedTemplateId(null)}
                >
                  <LayoutTemplate
                    size={16}
                    className="text-text-dim flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-text">
                      템플릿 없음
                    </div>
                    <div className="text-xs text-text-dim mt-0.5">
                      기본 탭만 생성합니다
                    </div>
                  </div>
                  {selectedTemplateId === null && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path
                          d="M1 3l2 2 4-4"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </button>

                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg border text-left transition-colors cursor-pointer font-[inherit] ${
                      selectedTemplateId === tpl.id
                        ? "border-accent bg-accent/5"
                        : "border-border bg-surface-3 hover:border-border-light"
                    }`}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                  >
                    <LayoutTemplate
                      size={16}
                      className="text-accent flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text">
                          {tpl.name}
                        </span>
                        {tpl.isSystem && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-4 text-text-dim border border-border">
                            기본
                          </span>
                        )}
                      </div>
                      {tpl.description && (
                        <div className="text-xs text-text-dim mt-0.5 truncate">
                          {tpl.description}
                        </div>
                      )}
                    </div>
                    {selectedTemplateId === tpl.id && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path
                            d="M1 3l2 2 4-4"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                className="text-xs text-text-dim hover:text-text border-none bg-transparent cursor-pointer px-0 py-0"
                onClick={() => setStep({ kind: "choose" })}
              >
                ← 뒤로
              </button>
              <button
                className="px-4 py-1.5 text-[12px] font-semibold text-white bg-accent rounded-md hover:opacity-90 transition-opacity cursor-pointer border-none font-[inherit]"
                onClick={() => setStep({ kind: "form" })}
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {step.kind === "form" && (
          <div className="p-5 space-y-3">
            <input
              className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors font-[inherit]"
              placeholder="스페이스 이름 (예: 백엔드 3기)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <input
              className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors font-[inherit]"
              placeholder="설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors font-[inherit]"
                placeholder="시작일"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors font-[inherit]"
                placeholder="종료일"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-red">{error}</p>}

            <div className="flex items-center justify-between pt-1">
              <button
                className="text-xs text-text-dim hover:text-text border-none bg-transparent cursor-pointer px-0 py-0"
                onClick={() => setStep({ kind: "template" })}
              >
                ← 뒤로
              </button>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 text-[12px] text-text-secondary bg-surface-3 border border-border rounded-md hover:border-border-light transition-colors cursor-pointer font-[inherit]"
                  onClick={onClose}
                >
                  취소
                </button>
                <button
                  className="px-4 py-1.5 text-[12px] font-semibold text-white bg-accent rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-none font-[inherit]"
                  disabled={saving || !name.trim()}
                  onClick={() => void handleCreate()}
                >
                  {saving ? "만드는 중..." : "만들기"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
