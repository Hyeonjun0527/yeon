"use client";

// 개발 전용 테스트 페이지 — 프로덕션 빌드에서는 404 처리
import { useEffect } from "react";
import { FilePreview } from "@/features/cloud-import/components/file-preview";

export default function FilePreviewTestPage() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      window.location.href = "/";
    }
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      style={{
        width: "600px",
        height: "400px",
        margin: "40px auto",
        border: "1px solid #ccc",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <FilePreview
        uri="/api/test/sample-xlsx"
        mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fileName="sample.xlsx"
      />
    </div>
  );
}
