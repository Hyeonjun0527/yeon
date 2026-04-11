"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cloud,
} from "lucide-react";
import type { Member } from "../types";
import { CloudProfilePicker } from "./cloud-profile-picker";

interface ProfileSuggestions {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: "active" | "withdrawn" | "graduated" | null;
  initialRiskLevel?: "low" | "medium" | "high" | null;
  confidence: Record<string, "high" | "medium" | "low">;
  rawContext?: string;
}

interface ProfileImportPanelProps {
  member: Member;
  onSaved?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: "수강중",
  withdrawn: "중도포기",
  graduated: "수료",
};

const RISK_LABELS: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#34d399",
  medium: "#fbbf24",
  low: "#f87171",
};

const FIELD_LABELS: Record<string, string> = {
  name: "이름",
  email: "이메일",
  phone: "전화번호",
  status: "수강 상태",
  initialRiskLevel: "위험도",
};

function formatValue(field: string, value: string | null | undefined): string {
  if (!value) return "─";
  if (field === "status") return STATUS_LABELS[value] ?? value;
  if (field === "initialRiskLevel") return RISK_LABELS[value] ?? value;
  return value;
}

function currentValue(
  member: Member,
  field: string,
): string | null | undefined {
  if (field === "name") return member.name;
  if (field === "email") return member.email;
  if (field === "phone") return member.phone;
  if (field === "status") return member.status;
  if (field === "initialRiskLevel") return member.initialRiskLevel;
  return null;
}

type Phase =
  | "idle"
  | "dragging"
  | "loading"
  | "review"
  | "saving"
  | "done"
  | "error";

export function ProfileImportPanel({
  member,
  onSaved,
}: ProfileImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProfileSuggestions | null>(
    null,
  );
  const [checkedFields, setCheckedFields] = useState<Set<string>>(new Set());
  const [showCloudPicker, setShowCloudPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 언마운트 시 지연 리셋 타이머 정리 */
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const suggestedFields = suggestions
    ? (
        ["name", "email", "phone", "status", "initialRiskLevel"] as const
      ).filter((f) => suggestions[f] != null)
    : [];

  const handleFile = useCallback(
    async (file: File) => {
      setPhase("loading");
      setErrorMessage(null);
      setSuggestions(null);
      setCheckedFields(new Set());

      const form = new FormData();
      form.append("file", file);

      try {
        const res = await fetch(
          `/api/v1/spaces/${member.spaceId}/members/${member.id}/profile-import`,
          { method: "POST", body: form },
        );

        const data = (await res.json()) as
          | { suggestions: ProfileSuggestions }
          | { error: string };

        if (!res.ok || "error" in data) {
          throw new Error(
            "error" in data ? data.error : "AI 분석에 실패했습니다.",
          );
        }

        const s = data.suggestions;
        setSuggestions(s);

        /* 신뢰도 high인 필드는 기본 체크 */
        const defaultChecked = new Set<string>();
        for (const field of [
          "name",
          "email",
          "phone",
          "status",
          "initialRiskLevel",
        ] as const) {
          if (
            s[field] != null &&
            (s.confidence?.[field] === "high" ||
              s.confidence?.[field] === "medium")
          ) {
            defaultChecked.add(field);
          }
        }
        setCheckedFields(defaultChecked);
        setPhase("review");
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "분석에 실패했습니다.",
        );
        setPhase("error");
      }
    },
    [member.spaceId, member.id],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setPhase("idle");
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleSave = useCallback(async () => {
    if (!suggestions || checkedFields.size === 0) return;

    setPhase("saving");

    const patch: Record<string, string | null> = {};
    for (const field of checkedFields) {
      const val = suggestions[field as keyof ProfileSuggestions];
      if (typeof val === "string" || val === null) {
        patch[field] = val ?? null;
      }
    }

    try {
      const res = await fetch(
        `/api/v1/spaces/${member.spaceId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "저장에 실패했습니다.");
      }

      setPhase("done");
      onSaved?.();

      /* 2초 후 패널 초기화 — ref로 관리하여 언마운트/재호출 시 정리 가능 */
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => {
        resetTimeoutRef.current = null;
        setPhase("idle");
        setSuggestions(null);
        setCheckedFields(new Set());
      }, 2000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "저장에 실패했습니다.",
      );
      setPhase("error");
    }
  }, [suggestions, checkedFields, member.spaceId, member.id, onSaved]);

  const reset = () => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setPhase("idle");
    setSuggestions(null);
    setCheckedFields(new Set());
    setErrorMessage(null);
  };

  return (
    <div className="mt-4">
      {/* 헤더 (접기/펴기) */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 border border-border rounded-lg text-left transition-colors hover:border-border-light"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[13px] font-semibold text-text">
            AI 프로필 자동완성
          </span>
          <span className="text-[11px] text-text-dim px-1.5 py-0.5 bg-surface-3 rounded">
            Beta
          </span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-text-dim" />
        ) : (
          <ChevronDown size={14} className="text-text-dim" />
        )}
      </button>

      {open && (
        <div className="mt-2 border border-border rounded-lg overflow-hidden">
          {/* 설명 */}
          <div className="px-4 pt-3 pb-2 bg-surface-2 border-b border-border">
            <p className="text-[12px] text-text-dim leading-relaxed">
              CSV나 텍스트 파일을 업로드하면 AI가 수강생 프로필 정보를 자동으로
              추출합니다. 추출된 값을 확인 후 선택적으로 적용할 수 있습니다.
            </p>
          </div>

          {/* idle — 드롭존 */}
          {(phase === "idle" || phase === "dragging") && (
            <div className="m-4 space-y-2">
              <div
                className={`relative border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-6 gap-2 cursor-pointer transition-all ${
                  phase === "dragging"
                    ? "border-accent bg-accent-dim"
                    : "border-border hover:border-border-light"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setPhase("dragging");
                }}
                onDragLeave={() => setPhase("idle")}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = "";
                  }}
                />
                <Upload
                  size={24}
                  className={
                    phase === "dragging" ? "text-accent" : "text-text-dim"
                  }
                />
                <div className="text-center">
                  <p className="text-[13px] font-medium text-text-secondary">
                    파일을 드래그하거나 클릭해서 선택
                  </p>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    CSV, TXT 지원 · 최대 1MB
                  </p>
                </div>
              </div>

              <button
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border bg-surface-3 text-[12px] text-text-secondary hover:border-border-light hover:text-text transition-colors cursor-pointer font-[inherit]"
                onClick={() => setShowCloudPicker(true)}
              >
                <Cloud size={14} />
                클라우드에서 가져오기 (OneDrive · Google Drive)
              </button>
            </div>
          )}

          {showCloudPicker && (
            <CloudProfilePicker
              onFilePicked={(file) => {
                setShowCloudPicker(false);
                void handleFile(file);
              }}
              onClose={() => setShowCloudPicker(false)}
            />
          )}

          {/* loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
              <p className="text-[13px] text-text-secondary">
                AI가 파일을 분석하고 있습니다...
              </p>
            </div>
          )}

          {/* error */}
          {phase === "error" && (
            <div className="m-4 flex flex-col items-center gap-3 py-6">
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-[13px] text-text-secondary text-center">
                {errorMessage}
              </p>
              <button
                className="px-4 py-1.5 bg-surface-3 border border-border rounded text-[12px] text-text-secondary hover:border-border-light transition-colors"
                onClick={reset}
              >
                다시 시도
              </button>
            </div>
          )}

          {/* review */}
          {phase === "review" && suggestions && (
            <div className="p-4 space-y-3">
              {/* 추출 근거 */}
              {suggestions.rawContext && (
                <div className="px-3 py-2 bg-surface-3 rounded text-[11px] text-text-dim leading-relaxed border border-border">
                  <span className="font-semibold text-text-secondary">
                    추출 근거:{" "}
                  </span>
                  {suggestions.rawContext}
                </div>
              )}

              {suggestedFields.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText size={24} className="text-text-dim" />
                  <p className="text-[13px] text-text-dim">
                    파일에서 프로필 정보를 찾지 못했습니다.
                  </p>
                  <button
                    className="mt-1 px-4 py-1.5 bg-surface-3 border border-border rounded text-[12px] text-text-secondary hover:border-border-light transition-colors"
                    onClick={reset}
                  >
                    다른 파일 선택
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-text-dim">
                    적용할 필드를 선택하세요:
                  </p>

                  {/* 필드 행 */}
                  <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                    {suggestedFields.map((field) => {
                      const suggested = suggestions[field];
                      const current = currentValue(member, field);
                      const confidence = suggestions.confidence?.[field];
                      const checked = checkedFields.has(field);
                      const isSame = current === suggested;

                      return (
                        <label
                          key={field}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            checked
                              ? "bg-accent-dim"
                              : "bg-surface-2 hover:bg-surface-3"
                          }`}
                        >
                          {/* 체크박스 */}
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              checked
                                ? "bg-accent border-accent"
                                : "border-border bg-surface-3"
                            }`}
                            onClick={() => {
                              setCheckedFields((prev) => {
                                const next = new Set(prev);
                                if (next.has(field)) next.delete(field);
                                else next.add(field);
                                return next;
                              });
                            }}
                          >
                            {checked && <Check size={10} className="text-bg" />}
                          </div>

                          {/* 필드 라벨 */}
                          <span className="text-[12px] text-text-dim w-20 flex-shrink-0 font-mono">
                            {FIELD_LABELS[field]}
                          </span>

                          {/* 현재값 → 제안값 */}
                          <div className="flex-1 flex items-center gap-2 min-w-0 text-[12px]">
                            <span className="text-text-dim truncate">
                              {formatValue(field, current ?? null)}
                            </span>
                            {!isSame && (
                              <>
                                <span className="text-text-dim flex-shrink-0">
                                  →
                                </span>
                                <span
                                  className="font-medium truncate"
                                  style={{ color: "var(--accent)" }}
                                >
                                  {formatValue(field, suggested ?? null)}
                                </span>
                              </>
                            )}
                            {isSame && (
                              <span className="text-[11px] text-text-dim">
                                (동일)
                              </span>
                            )}
                          </div>

                          {/* 신뢰도 */}
                          {confidence && (
                            <span
                              className="text-[10px] font-mono flex-shrink-0 font-semibold"
                              style={{ color: CONFIDENCE_COLORS[confidence] }}
                            >
                              {confidence === "high"
                                ? "확실"
                                : confidence === "medium"
                                  ? "보통"
                                  : "불확실"}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      className="flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text-secondary transition-colors"
                      onClick={reset}
                    >
                      <X size={12} />
                      취소
                    </button>

                    <button
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-bg rounded text-[12px] font-semibold disabled:opacity-40 transition-opacity hover:opacity-90"
                      disabled={checkedFields.size === 0}
                      onClick={() => void handleSave()}
                    >
                      <Check size={13} />
                      {checkedFields.size}개 필드 적용
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* saving */}
          {phase === "saving" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin" />
              <p className="text-[13px] text-text-secondary">저장 중...</p>
            </div>
          )}

          {/* done */}
          {phase === "done" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="w-10 h-10 rounded-full bg-accent-dim border border-accent-border flex items-center justify-center">
                <Check size={20} className="text-accent" />
              </div>
              <p className="text-[13px] text-text-secondary font-medium">
                프로필이 업데이트되었습니다
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
