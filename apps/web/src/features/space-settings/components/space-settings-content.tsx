"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { isProtectedMemberTab } from "@/lib/member-tab-policy";
import { FIELD_TYPE_LABELS } from "../types";
import type { FieldType, SpaceTab } from "../types";
import { useSpaceSettings } from "../hooks/use-space-settings";
import { getAdjacentCustomTabIndexes } from "../space-settings-utils";
import { SpaceTemplatePreviewModal } from "./space-template-preview-modal";

interface SpaceSettingsContentProps {
  spaceId: string;
  spaceName?: string;
  initialTabId?: string | null;
  onBack?: () => void;
  onClose: () => void;
}

const ALL_FIELD_TYPES: FieldType[] = [
  "text",
  "long_text",
  "number",
  "date",
  "select",
  "multi_select",
  "checkbox",
  "url",
  "email",
  "phone",
];

export function SpaceSettingsContent({
  spaceId,
  spaceName,
  initialTabId,
  onBack,
  onClose,
}: SpaceSettingsContentProps) {
  const {
    tabs,
    tabsLoading,
    selectedTabId,
    setSelectedTabId,
    fields,
    fieldsLoading,
    templates,
    templatesLoading,
    error,
    createTab,
    renameTab,
    toggleTabVisibility,
    deleteTab,
    reorderTabs,
    resetToDefaults,
    createField,
    updateField,
    deleteField,
    reorderFields,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    snapshotTemplate,
    applyTemplate,
  } = useSpaceSettings(spaceId, initialTabId ?? undefined);

  const [newTabName, setNewTabName] = useState("");
  const [addingTab, setAddingTab] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [addingField, setAddingField] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteTabId, setConfirmDeleteTabId] = useState<string | null>(
    null,
  );
  const [resetting, setResetting] = useState(false);
  const [templateName, setTemplateName] = useState(
    spaceName ? `${spaceName} 템플릿` : "",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateDescription, setEditingTemplateDescription] =
    useState("");
  const [updatingTemplate, setUpdatingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [duplicatingTemplate, setDuplicatingTemplate] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedTab = tabs.find((t) => t.id === selectedTabId) ?? null;
  const selectedStudentBoardTab = selectedTab?.systemKey === "student_board";
  const confirmDeleteTab =
    tabs.find((tab) => tab.id === confirmDeleteTabId) ?? null;
  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setEditingTemplateName("");
      setEditingTemplateDescription("");
      return;
    }

    setEditingTemplateName(selectedTemplate.name);
    setEditingTemplateDescription(selectedTemplate.description ?? "");
  }, [selectedTemplate]);

  async function handleCreateTab() {
    const name = newTabName.trim();
    if (!name) return;
    setAddingTab(true);
    await createTab(name);
    setNewTabName("");
    setAddingTab(false);
  }

  async function handleCreateField() {
    if (!selectedTabId) return;
    const name = newFieldName.trim();
    if (!name) return;
    setAddingField(true);
    await createField(selectedTabId, name, newFieldType);
    setNewFieldName("");
    setNewFieldType("text");
    setAddingField(false);
  }

  async function handleResetToDefaults() {
    setResetting(true);
    await resetToDefaults();
    setConfirmReset(false);
    setResetting(false);
  }

  async function handleSnapshotTemplate() {
    const name = templateName.trim();
    if (!name) return;
    setSavingTemplate(true);
    const template = await snapshotTemplate(name);
    if (template) {
      setSelectedTemplateId(template.id);
    }
    setSavingTemplate(false);
  }

  async function handleApplyTemplate() {
    if (!selectedTemplateId) return;
    setApplyingTemplate(true);
    await applyTemplate(selectedTemplateId);
    setApplyingTemplate(false);
  }

  async function handleUpdateTemplate() {
    if (!selectedTemplate || selectedTemplate.isSystem) return;
    setUpdatingTemplate(true);
    const updatedTemplate = await updateTemplate(selectedTemplate.id, {
      name: editingTemplateName,
      description: editingTemplateDescription,
    });
    if (updatedTemplate) {
      setEditingTemplateName(updatedTemplate.name);
      setEditingTemplateDescription(updatedTemplate.description ?? "");
    }
    setUpdatingTemplate(false);
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplate || selectedTemplate.isSystem) return;
    const confirmed = window.confirm(
      `"${selectedTemplate.name}" 템플릿을 삭제할까요?`,
    );
    if (!confirmed) return;

    setDeletingTemplate(true);
    const deleted = await deleteTemplate(selectedTemplate.id);
    if (deleted) {
      setSelectedTemplateId("");
    }
    setDeletingTemplate(false);
  }

  async function handleDuplicateTemplate() {
    if (!selectedTemplate) return;
    setDuplicatingTemplate(true);
    const duplicated = await duplicateTemplate(selectedTemplate.id);
    if (duplicated) {
      setSelectedTemplateId(duplicated.id);
    }
    setDuplicatingTemplate(false);
  }

  const templateEditDirty =
    selectedTemplate !== null &&
    !selectedTemplate.isSystem &&
    (editingTemplateName.trim() !== selectedTemplate.name ||
      editingTemplateDescription.trim() !==
        (selectedTemplate.description ?? ""));

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2 text-text-dim transition-colors hover:bg-surface-3 hover:text-text"
              onClick={onBack}
              aria-label="뒤로 가기"
            >
              <ArrowLeft size={15} />
            </button>
          ) : null}
          <div>
            <h2 className="text-base font-semibold text-text">
              수강생 정보 구성
            </h2>
            <p className="text-xs text-text-dim mt-0.5">
              {spaceName ? `${spaceName} · ` : ""}수강생 상세 페이지의 탭과 입력
              항목을 설정합니다
            </p>
          </div>
        </div>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-dim hover:text-text hover:bg-surface-3 transition-colors border-none bg-transparent cursor-pointer"
          onClick={onClose}
          aria-label="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex-shrink-0">
          {error}
        </div>
      )}

      <div className="mx-6 mt-3 rounded-lg border border-border bg-surface-2/60 flex-shrink-0">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              구성 템플릿
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-dim">
              자주 쓰는 수강생 정보 구성을 저장해 두고 현재 스페이스에 그대로
              적용할 수 있습니다.
            </p>
          </div>
          <span className="text-[10px] text-text-dim whitespace-nowrap">
            {templatesLoading ? "불러오는 중…" : `${templates.length}개`}
          </span>
        </div>

        <div className="grid gap-3 px-4 py-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              저장된 템플릿 적용
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-surface-3 border border-border rounded-md px-2 py-[7px] text-xs text-text outline-none focus:border-accent transition-colors cursor-pointer"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={
                  templatesLoading || templates.length === 0 || applyingTemplate
                }
              >
                <option value="">
                  {templates.length === 0
                    ? "저장된 템플릿이 없습니다"
                    : "적용할 템플릿을 선택하세요"}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.isSystem ? " · 기본" : ""}
                  </option>
                ))}
              </select>
              <button
                className="px-3 py-[7px] rounded-md bg-accent text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity border-none disabled:opacity-50 whitespace-nowrap"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId || applyingTemplate}
              >
                {applyingTemplate ? "적용 중…" : "적용"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              현재 구성을 템플릿으로 저장
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-surface-3 border border-border rounded-md px-2 py-[7px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
                placeholder="예: 개발반 기본 구성"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSnapshotTemplate();
                }}
                maxLength={80}
                disabled={savingTemplate}
              />
              <button
                className="px-3 py-[7px] rounded-md border border-border bg-transparent text-text-secondary text-xs font-medium cursor-pointer hover:bg-[var(--surface3)] hover:text-text transition-colors disabled:opacity-50 whitespace-nowrap"
                onClick={handleSnapshotTemplate}
                disabled={savingTemplate || !templateName.trim()}
              >
                {savingTemplate ? "저장 중…" : "현재 구성 저장"}
              </button>
            </div>
          </div>
        </div>

        {selectedTemplate && (
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
                  선택된 템플릿 정보
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">
                    {selectedTemplate.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-dim border border-border">
                    {selectedTemplate.isSystem
                      ? "기본 템플릿"
                      : "사용자 템플릿"}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-text-dim text-right">
                <div>{selectedTemplate.tabCount}개 탭</div>
                <div>{selectedTemplate.fieldCount}개 필드</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {selectedTemplate.tabPreviewNames.map((tabName) => (
                  <span
                    key={tabName}
                    className="rounded border border-border bg-surface-3 px-2 py-0.5 text-[10px] text-text-dim"
                  >
                    {tabName}
                  </span>
                ))}
              </div>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary bg-transparent cursor-pointer hover:bg-surface-3 hover:text-text transition-colors whitespace-nowrap"
                onClick={() => setPreviewOpen(true)}
                type="button"
              >
                <Eye size={12} />
                상세 보기
              </button>
            </div>

            {selectedTemplate.fieldPreviewNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedTemplate.fieldPreviewNames.map((fieldName) => (
                  <span
                    key={fieldName}
                    className="rounded border border-border bg-transparent px-2 py-0.5 text-[10px] text-text-dim"
                  >
                    {fieldName}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
                  템플릿 이름
                </label>
                <input
                  className="w-full bg-surface-3 border border-border rounded-md px-2 py-[7px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors disabled:opacity-60"
                  value={editingTemplateName}
                  onChange={(e) => setEditingTemplateName(e.target.value)}
                  disabled={selectedTemplate.isSystem || updatingTemplate}
                  maxLength={80}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
                  템플릿 설명
                </label>
                <textarea
                  className="w-full resize-none bg-surface-3 border border-border rounded-md px-2 py-[7px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors disabled:opacity-60"
                  rows={3}
                  value={editingTemplateDescription}
                  onChange={(e) =>
                    setEditingTemplateDescription(e.target.value)
                  }
                  disabled={selectedTemplate.isSystem || updatingTemplate}
                  maxLength={500}
                  placeholder="이 템플릿이 어떤 스페이스 구조인지 설명해 두세요"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-text-dim leading-relaxed">
                {selectedTemplate.isSystem
                  ? "기본 템플릿은 이름과 설명을 수정하거나 삭제할 수 없습니다."
                  : "사용자 템플릿은 이름/설명을 정리하고 더 이상 쓰지 않으면 삭제할 수 있습니다."}
              </p>
              {!selectedTemplate.isSystem && (
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-[7px] rounded-md border border-border bg-transparent text-text-secondary text-xs font-medium cursor-pointer hover:bg-[var(--surface3)] hover:text-text transition-colors disabled:opacity-50 whitespace-nowrap"
                    onClick={handleDuplicateTemplate}
                    disabled={
                      duplicatingTemplate ||
                      deletingTemplate ||
                      updatingTemplate
                    }
                  >
                    {duplicatingTemplate ? "복제 중…" : "복제"}
                  </button>
                  <button
                    className="px-3 py-[7px] rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium cursor-pointer hover:bg-red-500/15 transition-colors disabled:opacity-50 whitespace-nowrap"
                    onClick={handleDeleteTemplate}
                    disabled={deletingTemplate || updatingTemplate}
                  >
                    {deletingTemplate ? "삭제 중…" : "삭제"}
                  </button>
                  <button
                    className="px-3 py-[7px] rounded-md bg-accent text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity border-none disabled:opacity-50 whitespace-nowrap"
                    onClick={handleUpdateTemplate}
                    disabled={!templateEditDirty || updatingTemplate}
                  >
                    {updatingTemplate ? "저장 중…" : "변경 저장"}
                  </button>
                </div>
              )}
              {selectedTemplate.isSystem && (
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-[7px] rounded-md border border-border bg-transparent text-text-secondary text-xs font-medium cursor-pointer hover:bg-[var(--surface3)] hover:text-text transition-colors disabled:opacity-50 whitespace-nowrap"
                    onClick={handleDuplicateTemplate}
                    disabled={duplicatingTemplate}
                  >
                    {duplicatingTemplate ? "복제 중…" : "복제해서 수정"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 탭 목록 */}
        <div className="w-[280px] border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">
              탭 목록
            </span>
            <p className="text-[10px] text-text-dim mt-1 leading-relaxed">
              수강생 상세 페이지에 표시할 탭을 추가하고 순서를 조정하세요
            </p>
          </div>

          <div className="scrollbar-subtle flex-1 overflow-y-auto py-1">
            {tabsLoading ? (
              <div className="px-4 py-4 text-xs text-text-dim text-center">
                불러오는 중…
              </div>
            ) : (
              tabs.map((tab, idx) => {
                const { previousIndex, nextIndex } =
                  getAdjacentCustomTabIndexes(tabs, idx);

                return (
                  <TabRow
                    key={tab.id}
                    tab={tab}
                    isSelected={tab.id === selectedTabId}
                    canMoveUp={previousIndex !== null}
                    canMoveDown={nextIndex !== null}
                    onSelect={() => setSelectedTabId(tab.id)}
                    onRename={(name) => renameTab(tab.id, name)}
                    onToggleVisible={() => toggleTabVisibility(tab.id)}
                    onDelete={() => setConfirmDeleteTabId(tab.id)}
                    onMoveUp={() => {
                      if (previousIndex === null) return;
                      reorderTabs(idx, previousIndex);
                    }}
                    onMoveDown={() => {
                      if (nextIndex === null) return;
                      reorderTabs(idx, nextIndex);
                    }}
                  />
                );
              })
            )}
          </div>

          <div className="border-t border-border px-4 py-3 flex-shrink-0">
            <p className="text-[10px] text-text-dim mb-2">
              탭 이름 입력 후 추가 버튼을 누르세요
            </p>
            <input
              className="w-full bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors mb-2"
              placeholder="새 탭 이름 (예: 포트폴리오, 출결)"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTab();
              }}
              maxLength={80}
            />
            <button
              className="w-full py-[6px] rounded-md bg-accent text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity border-none disabled:opacity-50"
              onClick={handleCreateTab}
              disabled={addingTab || !newTabName.trim()}
            >
              + 탭 추가
            </button>
          </div>
        </div>

        {/* 우측 필드 편집 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedTab ? (
            <>
              <div className="px-6 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div>
                  <span className="text-sm font-semibold text-text">
                    {selectedTab.name}
                  </span>
                  {isProtectedMemberTab(selectedTab) ? (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-dim border border-border">
                      읽기 전용
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-text-dim">
                  {fields.length}개 필드
                </span>
              </div>

              <div className="scrollbar-subtle flex-1 overflow-y-auto">
                {fieldsLoading ? (
                  <div className="px-6 py-8 text-xs text-text-dim text-center">
                    불러오는 중…
                  </div>
                ) : selectedStudentBoardTab ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-xs text-text-dim">
                      출석·과제 탭은 조회 전용 기본 탭입니다
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-text-dim">
                      이 탭의 내용은 출석·과제 보드와 학생 상세 집계에서
                      자동으로 구성됩니다.
                    </p>
                  </div>
                ) : fields.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-xs text-text-dim">
                      아직 추가된 항목이 없습니다
                    </p>
                    <p className="text-[11px] text-text-dim mt-1 leading-relaxed">
                      아래에서 항목 이름과 타입을 입력하고
                      <br />
                      추가 버튼을 눌러 수집할 정보를 정의하세요
                    </p>
                  </div>
                ) : (
                  <div className="py-2 divide-y divide-border">
                    {fields.map((field, idx) => (
                      <FieldRow
                        fieldId={field.id}
                        key={field.id}
                        name={field.name}
                        fieldType={field.fieldType}
                        isRequired={field.isRequired}
                        options={field.options}
                        onUpdate={(input) => updateField(field.id, input)}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < fields.length - 1}
                        onDelete={() => deleteField(field.id)}
                        onMoveUp={() =>
                          reorderFields(selectedTab.id, idx, idx - 1)
                        }
                        onMoveDown={() =>
                          reorderFields(selectedTab.id, idx, idx + 1)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {!selectedStudentBoardTab && (
                <div className="border-t border-border px-6 py-3 flex-shrink-0">
                  <p className="text-[10px] text-text-dim mb-2">
                    수강생마다 수집할 항목을 추가합니다 (예: GitHub URL, 희망
                    직무, 최종 학력)
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
                      placeholder="항목 이름"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateField();
                      }}
                      maxLength={80}
                    />
                    <select
                      className="bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text outline-none focus:border-accent transition-colors cursor-pointer"
                      value={newFieldType}
                      onChange={(e) =>
                        setNewFieldType(e.target.value as FieldType)
                      }
                    >
                      {ALL_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {FIELD_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="px-3 py-[6px] rounded-md bg-accent text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity border-none disabled:opacity-50 whitespace-nowrap"
                      onClick={handleCreateField}
                      disabled={addingField || !newFieldName.trim()}
                    >
                      + 추가
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="text-text-dim opacity-40"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="4"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <rect
                  x="3"
                  y="10"
                  width="18"
                  height="11"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="7"
                  y1="14"
                  x2="17"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="7"
                  y1="17"
                  x2="13"
                  y2="17"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-xs text-text-dim">왼쪽에서 탭을 선택하세요</p>
              <p className="text-[11px] text-text-dim leading-relaxed">
                탭마다 수강생별로 수집할 항목을
                <br />
                자유롭게 추가할 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 초기화 영역 */}
      <div className="border-t border-border px-6 py-3 flex-shrink-0 flex items-center justify-between">
        <p className="text-[11px] text-text-dim">
          커스텀 탭·항목을 모두 제거하고 기본 설정으로 되돌립니다
        </p>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-secondary">
              정말 초기화할까요?
            </span>
            <button
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer border-none"
              onClick={handleResetToDefaults}
              disabled={resetting}
            >
              {resetting ? "초기화 중…" : "확인"}
            </button>
            <button
              className="px-2.5 py-1 rounded text-[11px] text-text-dim hover:text-text transition-colors cursor-pointer border-none bg-transparent"
              onClick={() => setConfirmReset(false)}
              disabled={resetting}
            >
              취소
            </button>
          </div>
        ) : (
          <button
            className="px-2.5 py-1 rounded text-[11px] font-medium text-text-dim border border-border hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer bg-transparent"
            onClick={() => setConfirmReset(true)}
          >
            기본값으로 초기화
          </button>
        )}
      </div>

      <SpaceTemplatePreviewModal
        templateId={selectedTemplateId || null}
        open={previewOpen && Boolean(selectedTemplateId)}
        onClose={() => setPreviewOpen(false)}
      />

      {confirmDeleteTab ? (
        <div
          className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmDeleteTabId(null);
            }
          }}
        >
          <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
                탭 삭제
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
                정말 삭제할까요?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                이 탭과 탭 안의 커스텀 필드가 현재 스페이스에서 함께 제거됩니다.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-dim">
                  삭제할 탭
                </p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {confirmDeleteTab.name}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text"
                onClick={() => setConfirmDeleteTabId(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95"
                onClick={() => {
                  void deleteTab(confirmDeleteTab.id);
                  setConfirmDeleteTabId(null);
                }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── TabRow ──────────────────────────────────────────────────────────

interface TabRowProps {
  tab: SpaceTab;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function TabRow({
  tab,
  isSelected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onRename,
  onToggleVisible,
  onDelete,
  onMoveUp,
  onMoveDown,
}: TabRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tab.name);
  const isReadOnly = isProtectedMemberTab(tab);
  const canDelete = tab.tabType === "custom";
  const canHide = tab.tabType === "custom";
  const canReorder = tab.tabType === "custom";

  function startEdit(e: React.MouseEvent) {
    if (isReadOnly) {
      return;
    }
    e.stopPropagation();
    setEditValue(tab.name);
    setEditing(true);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== tab.name) onRename(trimmed);
    setEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setEditValue(tab.name);
    }
  }

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-[6px] mx-1 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? "bg-surface-3 border border-border-light"
          : "hover:bg-surface-3"
      } ${!tab.isVisible ? "opacity-50" : ""}`}
      onClick={editing ? undefined : onSelect}
    >
      <div className="flex w-4 flex-col gap-0.5">
        {canReorder ? (
          <>
            <button
              className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={!canMoveUp}
            >
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path
                  d="M1 5l3-4 3 4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={!canMoveDown}
            >
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path
                  d="M1 1l3 4 3-4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        ) : (
          <span className="block h-6" aria-hidden="true" />
        )}
      </div>

      {editing ? (
        <input
          autoFocus
          className="flex-1 bg-surface-2 border border-accent rounded px-1.5 py-0.5 text-xs text-text outline-none min-w-0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
          onClick={(e) => e.stopPropagation()}
          maxLength={80}
        />
      ) : (
        <span
          className={`flex-1 text-xs truncate ${isSelected ? "text-text font-medium" : "text-text-secondary"}`}
          onDoubleClick={isReadOnly ? undefined : startEdit}
          title={isReadOnly ? tab.name : "더블클릭으로 이름 변경"}
        >
          {tab.name}
        </span>
      )}

      {!editing && (
        <>
          {isReadOnly ? (
            <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-dim">
              읽기 전용
            </span>
          ) : (
            <button
              className="w-5 h-5 flex items-center justify-center text-text-dim hover:text-accent opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0"
              onClick={startEdit}
              title="이름 변경"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path
                  d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {canHide && (
            <button
              className={`w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0 ${tab.isVisible ? "text-text-dim hover:text-text" : "text-text-dim"}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisible();
              }}
              title={tab.isVisible ? "탭 숨기기" : "탭 표시"}
            >
              {tab.isVisible ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="6"
                    cy="6"
                    r="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1l10 10M4.5 3A5 5 0 0111 6s-.5 1-1.5 2M7.5 9A5 5 0 011 6s.5-1 1.5-2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          )}
          {canDelete && (
            <button
              className="w-5 h-5 flex items-center justify-center text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="탭 삭제"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1 1l8 8M9 1L1 9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── FieldRow ─────────────────────────────────────────────────────────

interface FieldRowProps {
  fieldId: string;
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  options?: { value: string; color: string }[] | null;
  onUpdate: (input: {
    name?: string;
    fieldType?: FieldType;
    isRequired?: boolean;
    options?: { value: string; color: string }[] | null;
  }) => Promise<unknown> | unknown;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function toOptionValuesText(
  options: { value: string; color: string }[] | null | undefined,
) {
  if (!options) {
    return "";
  }

  return options.map((option) => option.value).join(", ");
}

function toNormalizedOptions(
  text: string,
  isOptionField: boolean,
): { value: string; color: string }[] | null {
  if (!isOptionField) {
    return null;
  }

  return text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({ value, color: "#6366f1" }));
}

function FieldRow({
  fieldId,
  name,
  fieldType,
  isRequired,
  options,
  onUpdate,
  canMoveUp,
  canMoveDown,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editFieldType, setEditFieldType] = useState(fieldType);
  const [editRequired, setEditRequired] = useState(isRequired);
  const [editOptionsText, setEditOptionsText] = useState(
    toOptionValuesText(options),
  );
  const isOptionField =
    editFieldType === "select" || editFieldType === "multi_select";

  useEffect(() => {
    setEditName(name);
    setEditFieldType(fieldType);
    setEditRequired(isRequired);
    setEditOptionsText(toOptionValuesText(options));
  }, [fieldId, fieldType, isRequired, name, options]);

  async function commitEdit() {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditName(name);
      setEditFieldType(fieldType);
      setEditRequired(isRequired);
      setEditOptionsText(toOptionValuesText(options));
      setEditing(false);
      return;
    }

    const nextOptions = toNormalizedOptions(editOptionsText, isOptionField);

    const currentOptions = toNormalizedOptions(
      toOptionValuesText(options),
      isOptionField,
    );

    if (
      trimmed !== name ||
      editRequired !== isRequired ||
      editFieldType !== fieldType ||
      JSON.stringify(nextOptions) !== JSON.stringify(currentOptions)
    ) {
      await onUpdate({
        name: trimmed,
        fieldType: editFieldType,
        isRequired: editRequired,
        options: nextOptions,
      });
    }
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-2 px-6 py-[10px]">
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0"
          onClick={onMoveUp}
          disabled={!canMoveUp}
        >
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path
              d="M1 5l3-4 3 4"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0"
          onClick={onMoveDown}
          disabled={!canMoveDown}
        >
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path
              d="M1 1l3 4 3-4"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              autoFocus
              className="w-full rounded-md border border-accent bg-surface-2 px-2 py-1 text-[13px] text-text outline-none"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => {
                void commitEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitEdit();
                }
                if (e.key === "Escape") {
                  setEditName(name);
                  setEditFieldType(fieldType);
                  setEditRequired(isRequired);
                  setEditOptionsText(toOptionValuesText(options));
                  setEditing(false);
                }
              }}
              maxLength={80}
            />
            <select
              className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[12px] text-text outline-none"
              value={editFieldType}
              onChange={(e) => setEditFieldType(e.target.value as FieldType)}
            >
              {ALL_FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            {isOptionField ? (
              <textarea
                className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[12px] text-text outline-none"
                rows={3}
                value={editOptionsText}
                onChange={(e) => setEditOptionsText(e.target.value)}
                placeholder="옵션을 쉼표로 구분해 입력하세요"
              />
            ) : null}
            <label className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
              <input
                type="checkbox"
                checked={editRequired}
                onChange={(e) => setEditRequired(e.target.checked)}
              />
              필수 항목
            </label>
          </div>
        ) : (
          <>
            <span className="text-[13px] text-text">{name}</span>
            {isRequired && (
              <span className="ml-1 text-[10px] text-red-400">*필수</span>
            )}
          </>
        )}
      </div>
      <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-3 text-text-dim border border-border flex-shrink-0">
        {FIELD_TYPE_LABELS[fieldType]}
      </span>
      <div className="flex items-center gap-1">
        {!editing ? (
          <button
            className="w-6 h-6 flex items-center justify-center text-text-dim hover:text-accent opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0 flex-shrink-0"
            onClick={() => setEditing(true)}
            title="항목 수정"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M7 1.5l1.5 1.5L3.5 8H2V6.5L7 1.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
        <button
          className="w-6 h-6 flex items-center justify-center text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0 flex-shrink-0"
          onClick={onDelete}
          title="항목 삭제"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1 1l8 8M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
