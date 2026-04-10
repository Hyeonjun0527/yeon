"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface BulkActionBarProps {
  selectedCount: number;
  onAssignClass: () => void;
  onChangeStatus: () => void;
  onClose: () => void;
}

export function BulkActionBar({
  selectedCount,
  onAssignClass,
  onChangeStatus,
  onClose,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 py-3 px-6 bg-surface-3 border border-border-light text-text rounded z-50 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 max-md:bottom-3 max-md:left-3 max-md:right-3 max-md:translate-x-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <span>{selectedCount}명 선택됨</span>
          <button
            className="py-1.5 px-[14px] border border-white/20 rounded-sm bg-transparent text-text text-[13px] cursor-pointer transition-[background] duration-150 hover:bg-white/10"
            onClick={onAssignClass}
          >
            반 배정
          </button>
          <button
            className="py-1.5 px-[14px] border border-white/20 rounded-sm bg-transparent text-text text-[13px] cursor-pointer transition-[background] duration-150 hover:bg-white/10"
            onClick={onChangeStatus}
          >
            상태 변경
          </button>
          <button
            className="p-1 border-none bg-transparent text-text-dim cursor-pointer flex"
            onClick={onClose}
            aria-label="선택 해제"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
