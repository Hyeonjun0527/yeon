"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useStudentManagement } from "../student-management-provider";
import { StudentForm } from "./student-form";

export function StudentSheet() {
  const { sheetMode, closeSheet } = useStudentManagement();

  return (
    <AnimatePresence>
      {sheetMode !== null && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
          />
          <motion.div
            key="panel"
            className="fixed top-0 right-0 bottom-0 w-[480px] max-w-full bg-surface border-l border-border shadow-[-4px_0_24px_rgba(0,0,0,0.3)] z-[101] flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <div className="flex items-center justify-between py-5 px-6 border-b border-border">
              <h2 className="text-lg font-bold text-text">
                {sheetMode === "create" ? "수강생 등록" : "수강생 수정"}
              </h2>
              <button
                type="button"
                className="p-1 border-none bg-transparent text-text-dim cursor-pointer flex transition-colors duration-150 hover:text-text-secondary"
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
