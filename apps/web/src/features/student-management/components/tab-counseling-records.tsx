"use client";

import { useEffect, useState } from "react";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import { Loader2, FileAudio, Link2Off } from "lucide-react";

interface TabCounselingRecordsProps {
  spaceId: string;
  memberId: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fmtDuration(ms: number | null) {
  if (!ms) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TabCounselingRecords({
  spaceId,
  memberId,
}: TabCounselingRecordsProps) {
  const [records, setRecords] = useState<CounselingRecordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/spaces/${spaceId}/members/${memberId}/counseling-records`)
      .then(async (res) => {
        if (!res.ok) throw new Error("상담 기록을 불러오지 못했습니다.");
        const data = (await res.json()) as {
          records: CounselingRecordListItem[];
        };
        setRecords(data.records);
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error ? e.message : "상담 기록을 불러오지 못했습니다.",
        );
      })
      .finally(() => setLoading(false));
  }, [spaceId, memberId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-text-dim text-[14px]">
        <Loader2 size={16} className="animate-spin" />
        상담 기록 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-[14px] text-error">{error}</div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-center">
        <Link2Off size={28} className="text-text-dim" />
        <p className="text-[14px] text-text-dim">
          연결된 상담 기록이 없습니다.
        </p>
        <p className="text-[13px] text-text-dim max-w-[320px] leading-relaxed">
          상담 워크스페이스에서 녹음을 완료한 후 &apos;수강생 연결&apos;을 눌러
          이 수강생에 연결해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {records.map((record) => (
        <div
          key={record.id}
          className="flex items-start gap-4 py-4 px-4 bg-surface-2 border border-border rounded-lg hover:border-border-light transition-[border-color] duration-150"
        >
          <FileAudio size={16} className="text-text-dim mt-[2px] flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-text truncate">
                {record.sessionTitle}
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-surface-3 rounded text-text-dim flex-shrink-0">
                {record.counselingType}
              </span>
              {record.status === "ready" && (
                <span className="text-[11px] px-2 py-0.5 bg-accent-dim border border-accent-border rounded text-accent flex-shrink-0">
                  분석 완료
                </span>
              )}
              {record.status === "processing" && (
                <span className="text-[11px] px-2 py-0.5 bg-surface-3 rounded text-text-dim flex-shrink-0 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  처리 중
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-[12px] text-text-dim">
              <span>{fmtDate(record.createdAt)}</span>
              {record.audioDurationMs && (
                <>
                  <span>·</span>
                  <span>{fmtDuration(record.audioDurationMs)}</span>
                </>
              )}
              {record.counselorName && (
                <>
                  <span>·</span>
                  <span>{record.counselorName}</span>
                </>
              )}
            </div>

            {record.preview && record.status === "ready" && (
              <p className="mt-2 text-[13px] text-text-secondary leading-relaxed line-clamp-2">
                {record.preview}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
