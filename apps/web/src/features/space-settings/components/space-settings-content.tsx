"use client";

import { useState } from "react";
import { FIELD_TYPE_LABELS } from "../types";
import type { FieldType, SpaceTab } from "../types";
import { useSpaceSettings } from "../hooks/use-space-settings";

interface SpaceSettingsContentProps {
  spaceId: string;
  spaceName?: string;
  initialTabId?: string | null;
  onClose: () => void;
}

const ALL_FIELD_TYPES: FieldType[] = [
  "text", "long_text", "number", "date", "select",
  "multi_select", "checkbox", "url", "email", "phone",
];

export function SpaceSettingsContent({
  spaceId,
  spaceName,
  initialTabId,
  onClose,
}: SpaceSettingsContentProps) {
  const {
    tabs, tabsLoading, selectedTabId, setSelectedTabId,
    fields, fieldsLoading, error,
    createTab, renameTab, toggleTabVisibility, deleteTab, reorderTabs, resetToDefaults,
    createField, deleteField, reorderFields,
  } = useSpaceSettings(spaceId, initialTabId ?? undefined);

  const [newTabName, setNewTabName] = useState("");
  const [addingTab, setAddingTab] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [addingField, setAddingField] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const selectedTab = tabs.find((t) => t.id === selectedTabId) ?? null;

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

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-text">수강생 정보 구성</h2>
          <p className="text-xs text-text-dim mt-0.5">
            {spaceName ? `${spaceName} · ` : ""}수강생 상세 페이지의 탭과 입력 항목을 설정합니다
          </p>
        </div>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-dim hover:text-text hover:bg-surface-3 transition-colors border-none bg-transparent cursor-pointer"
          onClick={onClose}
          aria-label="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex-shrink-0">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 탭 목록 */}
        <div className="w-[280px] border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">탭 목록</span>
            <p className="text-[10px] text-text-dim mt-1 leading-relaxed">수강생 상세 페이지에 표시할 탭을 추가하고 순서를 조정하세요</p>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {tabsLoading ? (
              <div className="px-4 py-4 text-xs text-text-dim text-center">불러오는 중…</div>
            ) : (
              tabs.map((tab, idx) => (
                <TabRow
                  key={tab.id}
                  tab={tab}
                  isSelected={tab.id === selectedTabId}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < tabs.length - 1}
                  onSelect={() => setSelectedTabId(tab.id)}
                  onRename={(name) => renameTab(tab.id, name)}
                  onToggleVisible={() => toggleTabVisibility(tab.id)}
                  onDelete={() => deleteTab(tab.id)}
                  onMoveUp={() => reorderTabs(idx, idx - 1)}
                  onMoveDown={() => reorderTabs(idx, idx + 1)}
                />
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-3 flex-shrink-0">
            <p className="text-[10px] text-text-dim mb-2">탭 이름 입력 후 추가 버튼을 누르세요</p>
            <input
              className="w-full bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors mb-2"
              placeholder="새 탭 이름 (예: 포트폴리오, 출결)"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateTab(); }}
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
                  <span className="text-sm font-semibold text-text">{selectedTab.name}</span>
                  {selectedTab.tabType === "system" && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-dim border border-border">
                      시스템
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-dim">{fields.length}개 필드</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {fieldsLoading ? (
                  <div className="px-6 py-8 text-xs text-text-dim text-center">불러오는 중…</div>
                ) : fields.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-xs text-text-dim">아직 추가된 항목이 없습니다</p>
                    <p className="text-[11px] text-text-dim mt-1 leading-relaxed">아래에서 항목 이름과 타입을 입력하고<br/>추가 버튼을 눌러 수집할 정보를 정의하세요</p>
                  </div>
                ) : (
                  <div className="py-2 divide-y divide-border">
                    {fields.map((field, idx) => (
                      <FieldRow
                        key={field.id}
                        name={field.name}
                        fieldType={field.fieldType}
                        isRequired={field.isRequired}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < fields.length - 1}
                        onDelete={() => deleteField(field.id)}
                        onMoveUp={() => reorderFields(selectedTab.id, idx, idx - 1)}
                        onMoveDown={() => reorderFields(selectedTab.id, idx, idx + 1)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border px-6 py-3 flex-shrink-0">
                <p className="text-[10px] text-text-dim mb-2">수강생마다 수집할 항목을 추가합니다 (예: GitHub URL, 희망 직무, 최종 학력)</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
                    placeholder="항목 이름"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateField(); }}
                    maxLength={80}
                  />
                  <select
                    className="bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text outline-none focus:border-accent transition-colors cursor-pointer"
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                  >
                    {ALL_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-text-dim opacity-40">
                <rect x="3" y="3" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="3" y="10" width="18" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="7" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="7" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-xs text-text-dim">왼쪽에서 탭을 선택하세요</p>
              <p className="text-[11px] text-text-dim leading-relaxed">탭마다 수강생별로 수집할 항목을<br/>자유롭게 추가할 수 있습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 초기화 영역 */}
      <div className="border-t border-border px-6 py-3 flex-shrink-0 flex items-center justify-between">
        <p className="text-[11px] text-text-dim">커스텀 탭·항목을 모두 제거하고 기본 설정으로 되돌립니다</p>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-secondary">정말 초기화할까요?</span>
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
  tab, isSelected, canMoveUp, canMoveDown,
  onSelect, onRename, onToggleVisible, onDelete, onMoveUp, onMoveDown,
}: TabRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tab.name);

  const canDelete = tab.tabType === "custom";
  const canHide = tab.systemKey !== "overview";

  function startEdit(e: React.MouseEvent) {
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
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { setEditing(false); setEditValue(tab.name); }
  }

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-[6px] mx-1 rounded-md cursor-pointer transition-colors ${
        isSelected ? "bg-surface-3 border border-border-light" : "hover:bg-surface-3"
      } ${!tab.isVisible ? "opacity-50" : ""}`}
      onClick={editing ? undefined : onSelect}
    >
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0"
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={!canMoveUp}
        >
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 5l3-4 3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0"
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={!canMoveDown}
        >
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 1l3 4 3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
          onDoubleClick={startEdit}
          title={tab.tabType === "system" ? tab.name : "더블클릭으로 이름 변경"}
        >
          {tab.name}
        </span>
      )}

      {!editing && (
        <>
          <button
            className="w-5 h-5 flex items-center justify-center text-text-dim hover:text-accent opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0"
            onClick={startEdit}
            title="이름 변경"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {canHide && (
            <button
              className={`w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0 ${tab.isVisible ? "text-text-dim hover:text-text" : "text-text-dim"}`}
              onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
              title={tab.isVisible ? "탭 숨기기" : "탭 표시"}
            >
              {tab.isVisible ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M4.5 3A5 5 0 0111 6s-.5 1-1.5 2M7.5 9A5 5 0 011 6s.5-1 1.5-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          )}
          {canDelete && (
            <button
              className="w-5 h-5 flex items-center justify-center text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="탭 삭제"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
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
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FieldRow({ name, fieldType, isRequired, canMoveUp, canMoveDown, onDelete, onMoveUp, onMoveDown }: FieldRowProps) {
  return (
    <div className="group flex items-center gap-2 px-6 py-[10px]">
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0"
          onClick={onMoveUp}
          disabled={!canMoveUp}
        >
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 5l3-4 3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className="w-4 h-3 flex items-center justify-center text-text-dim hover:text-text border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-0"
          onClick={onMoveDown}
          disabled={!canMoveDown}
        >
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 1l3 4 3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] text-text">{name}</span>
        {isRequired && <span className="ml-1 text-[10px] text-red-400">*필수</span>}
      </div>
      <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-3 text-text-dim border border-border flex-shrink-0">
        {FIELD_TYPE_LABELS[fieldType]}
      </span>
      <button
        className="w-6 h-6 flex items-center justify-center text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer p-0 flex-shrink-0"
        onClick={onDelete}
        title="항목 삭제"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
