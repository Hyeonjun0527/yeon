"use client";

import type { Memo } from "../types";
import styles from "../student-detail.module.css";

interface TabMemosProps {
  memos: Memo[];
  newMemoText: string;
  setNewMemoText: (text: string) => void;
  addMemo: () => void;
}

export function TabMemos({
  memos,
  newMemoText,
  setNewMemoText,
  addMemo,
}: TabMemosProps) {
  return (
    <div>
      <div className={styles.memoInput}>
        <textarea
          className={styles.memoTextarea}
          placeholder="메모를 입력하세요..."
          value={newMemoText}
          onChange={(e) => setNewMemoText(e.target.value)}
          rows={2}
        />
        <button
          className={styles.memoSubmitBtn}
          onClick={addMemo}
          disabled={!newMemoText.trim()}
        >
          추가
        </button>
      </div>

      {memos.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 14, padding: "8px 0" }}>
          메모가 없습니다.
        </div>
      ) : (
        <div className={styles.memoList}>
          {[...memos].reverse().map((memo) => (
            <div key={memo.id} className={styles.memoItem}>
              <div className={styles.memoItemHeader}>
                <span className={styles.memoItemDate}>{memo.date}</span>
                {memo.author && (
                  <span className={styles.memoItemAuthor}>{memo.author}</span>
                )}
              </div>
              <div className={styles.memoItemText}>{memo.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
