import { useState, useRef, useCallback } from "react";
import type { AiModelType } from "../_lib/constants";
import {
  AI_PANEL_MIN_WIDTH,
  AI_PANEL_MAX_WIDTH,
  AI_PANEL_DEFAULT_WIDTH,
} from "../_lib/constants";

export function useAiPanel() {
  const [width, setWidth] = useState(AI_PANEL_DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [model, setModel] = useState<AiModelType>("일반 모델");
  const [tab, setTab] = useState<"chat" | "history">("chat");

  /** 드래그 중 DOM 직접 조작에 사용할 패널 ref */
  const panelRef = useRef<HTMLDivElement>(null);
  /** 현재 width를 ref로 추적 (드래그 중 state 갱신 없이 읽기 위함) */
  const widthRef = useRef(AI_PANEL_DEFAULT_WIDTH);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((p) => !p);
  }, []);

  const toggleModel = useCallback(() => {
    setModel((p) => (p === "일반 모델" ? "고급 모델" : "일반 모델"));
  }, []);

  /**
   * 리사이즈 핵심:
   * - mousemove 중에는 setState 하지 않음 (리렌더 0회)
   * - panelRef.current.style.width를 직접 조작
   * - mouseup 시에만 최종 width를 setState로 커밋
   */
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.min(
        AI_PANEL_MAX_WIDTH,
        Math.max(AI_PANEL_MIN_WIDTH, startWidth + delta),
      );
      widthRef.current = newWidth;
      if (panelRef.current) {
        panelRef.current.style.width = `${newWidth}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setWidth(widthRef.current);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return {
    width,
    collapsed,
    model,
    tab,
    panelRef,
    setTab,
    toggleCollapsed,
    toggleModel,
    startResize,
    expand: () => setCollapsed(false),
  };
}
