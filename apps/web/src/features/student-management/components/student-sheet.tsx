"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useStudentManagement } from "../student-management-provider";
import { StudentForm } from "./student-form";
import styles from "../student-detail.module.css";

export function StudentSheet() {
  const { sheetMode, closeSheet } = useStudentManagement();

  return (
    <AnimatePresence>
      {sheetMode !== null && (
        <>
          <motion.div
            key="overlay"
            className={styles.sheetOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
          />
          <motion.div
            key="panel"
            className={styles.sheetPanel}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>
                {sheetMode === "create" ? "학생 등록" : "학생 수정"}
              </h2>
              <button
                type="button"
                className={styles.sheetCloseBtn}
                onClick={closeSheet}
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
            <StudentForm />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
