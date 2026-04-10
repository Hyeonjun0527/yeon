"use client";

import { useState } from "react";

import { FIELD_TYPE_LABELS } from "../types";
import type { FieldType, SpaceTab } from "../types";
import { useSpaceSettings } from "../hooks/use-space-settings";

interface SpaceSettingsModalProps {
  spaceId: string;
  spaceName: string;
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

export function SpaceSettingsModal({
  spaceId,
  spaceName,
  onClose,
}: SpaceSettingsModalProps) {
  const {
    tabs,
    tabsLoading,
    selectedTabId,
    setSelectedTabId,
    fields,
    fieldsLoading,
    error,
    createTab,
    toggleTabVisibility,
    deleteTab,
    reorderTabs,
    createField,
    deleteField,
    reorderFields,
  } = useSpaceSettings(spaceId);

  const [newTabName, setNewTabName] = useState("");
  const [addingTab, setAddingTab] = useState(false);

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [addingField, setAddingField] = useState(false);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface border border-border rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.5)] w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text">스페이스 설정</h2>
            <p className="text-xs text-text-dim mt-0.5">{spaceName}</p>
          </div>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-dim hover:text-text hover:bg-surface-3 transition-colors border-none bg-transparent cursor-pointer"
            onClick={onClose}
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
          <div className="w-52 border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-3 py-3 border-b border-border flex-shrink-0">
              <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">탭 구성</span>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {tabsLoading ? (
                <div className="px-3 py-4 text-xs text-text-dim text-center">불러오는 중…</div>
              ) : (
                tabs.map((tab, idx) => (
                  <TabRow
                    key={tab.id}
                    tab={tab}
                    isSelected={tab.id === selectedTabId}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < tabs.length - 1}
                    onSelect={() => setSelectedTabId(tab.id)}
                    onToggleVisible={() => toggleTabVisibility(tab.id)}
                    onDelete={() => deleteTab(tab.id)}
                    onMoveUp={() => reorderTabs(idx, idx - 1)}
                    onMoveDown={() => reorderTabs(idx, idx + 1)}
                  />
                ))
              )}
            </div>

            <div className="border-t border-border px-3 py-3 flex-shrink-0">
              <input
                className="w-full bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors mb-2"
                placeholder="새 탭 이름"
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

          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedTab ? (
              <>
                <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
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
                    <div className="px-5 py-8 text-xs text-text-dim text-center">불러오는 중…</div>
                  ) : fields.length === 0 ? (
                    <div className="px-5 py-8 text-xs text-text-dim text-center">
                      아직 커스텀 필드가 없습니다
                    </div>
                  ) : (
                    <div className="py-2">
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

                <div className="border-t border-border px-5 py-3 flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-surface-3 border border-border rounded-md px-2 py-[6px] text-xs text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
                      placeholder="필드 이름"
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
                      onChange={(e) => setNewFieldType(e.target.value as FieldType)}
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-text-dim">
                왼쪽에서 탭을 선택하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TabRowProps {
  tab: SpaceTab;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
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
  onToggleVisible,
  onDelete,
  onMoveUp,
  onMoveDown,
}: TabRowProps) {
  const canDelete = tab.tabType === "custom";
  const canHide = tab.systemKey !== "overview";

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-[6px] mx-1 rounded-md cursor-pointer transition-colors ${
        isSelected ? "bg-surface-3 border border-border-light" : "hover:bg-surface-3"
      } ${!tab.isVisible ? "opacity-50" : ""}`}
      onClick={onSelect}
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

      <span className={`flex-1 text-xs truncate ${isSelected ? "text-text font-medium" : "text-text-secondary"}`}>
        {tab.name}
      </span>

      {canHide && (
        <button
          className="w-5 h-5 flex items-center justify-center rounded text-text-dim hover:text-text border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          title={tab.isVisible ? "숨기기" : "표시하기"}
        >
          {tab.isVisible ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M5 3.5C5.3 3.2 5.6 3 6 3c3 0 5 3 5 3s-.7 1.2-1.8 2.2M1 6s2-3.3 5-3.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}

      {canDelete && (
        <button
          className="w-5 h-5 flex items-center justify-center rounded text-text-dim hover:text-red-400 border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="탭 삭제"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

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

function FieldRow({
  name,
  fieldType,
  isRequired,
  canMoveUp,
  canMoveDown,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FieldRowProps) {
  return (
    <div className="group flex items-center gap-2 px-4 py-[7px] hover:bg-surface-3 transition-colors">
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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

      <span className="flex-1 text-xs text-text truncate">{name}</span>

      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-dim border border-border flex-shrink-0">
        {FIELD_TYPE_LABELS[fieldType]}
      </span>

      {isRequired && (
        <span className="text-[10px] text-accent flex-shrink-0">필수</span>
      )}

      <button
        className="w-5 h-5 flex items-center justify-center rounded text-text-dim hover:text-red-400 border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={onDelete}
        title="필드 삭제"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
