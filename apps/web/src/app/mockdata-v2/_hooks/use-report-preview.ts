import { useState, useCallback } from "react";

export function useReportPreview() {
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  const openPreview = useCallback((id: string) => setPreviewReportId(id), []);
  const closePreview = useCallback(() => setPreviewReportId(null), []);

  return { previewReportId, openPreview, closePreview } as const;
}
