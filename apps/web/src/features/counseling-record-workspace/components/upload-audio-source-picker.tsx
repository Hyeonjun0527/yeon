import { Mic, Upload } from "lucide-react";

export interface UploadAudioSourcePickerProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onStartRecording: () => void;
  isUploading: boolean;
}

export function UploadAudioSourcePicker({
  fileInputRef,
  onStartRecording,
  isUploading,
}: UploadAudioSourcePickerProps) {
  return (
    <div className="grid gap-[10px]">
      <button
        type="button"
        className="flex items-center gap-[14px] min-h-[76px] py-4 px-[18px] border rounded-[10px] text-left cursor-pointer transition-[transform,border-color,background-color,box-shadow] duration-[180ms] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
        style={{
          borderColor: "var(--border-soft)",
          background: "var(--surface-primary)",
        }}
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload
          size={20}
          strokeWidth={2}
          style={{ flexShrink: 0, color: "var(--accent)" }}
        />
        <div className="grid gap-[2px]">
          <span
            className="text-[15px] font-bold leading-[1.3]"
            style={{ color: "var(--text-primary)" }}
          >
            파일 업로드
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            오디오 파일에서 시작
          </span>
        </div>
      </button>
      <button
        type="button"
        className="flex items-center gap-[14px] min-h-[76px] py-4 px-[18px] border rounded-[10px] text-left cursor-pointer transition-[transform,border-color,background-color,box-shadow] duration-[180ms] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]"
        style={{
          borderColor: "var(--border-soft)",
          background: "var(--surface-primary)",
        }}
        onClick={onStartRecording}
        disabled={isUploading}
      >
        <Mic
          size={20}
          strokeWidth={2}
          style={{ flexShrink: 0, color: "var(--accent)" }}
        />
        <div className="grid gap-[2px]">
          <span
            className="text-[15px] font-bold leading-[1.3]"
            style={{ color: "var(--text-primary)" }}
          >
            바로 녹음하기
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            지금 바로 녹음 시작
          </span>
        </div>
      </button>
    </div>
  );
}
