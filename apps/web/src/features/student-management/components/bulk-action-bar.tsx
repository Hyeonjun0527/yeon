"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import styles from "../student-list.module.css";

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
          className={styles.bulkBar}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <span>{selectedCount}명 선택됨</span>
          <button className={styles.bulkBtn} onClick={onAssignClass}>
            반 배정
          </button>
          <button className={styles.bulkBtn} onClick={onChangeStatus}>
            상태 변경
          </button>
          <button
            className={styles.bulkClose}
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
