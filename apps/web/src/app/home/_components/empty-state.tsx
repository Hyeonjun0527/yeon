import { MicIcon, UploadIcon } from "./icons";

export interface EmptyStateProps {
  onStartRecording: () => void;
  onFileUpload: () => void;
}

export function EmptyState({ onStartRecording, onFileUpload }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="flex flex-col items-center gap-4 text-center max-w-[360px]">
        <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[20px] bg-accent-dim text-accent mb-1">
          <MicIcon size={32} />
        </div>
        <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
          첫 상담 기록을 만들어 보세요
        </h2>
        <p className="m-0 text-sm leading-relaxed text-text-secondary">
          음성 파일을 업로드하거나 브라우저에서 바로 녹음할 수 있습니다.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            className="flex items-center justify-center gap-2 px-7 py-[14px] border border-transparent rounded-xl text-[15px] font-bold cursor-pointer font-[inherit] transition-[opacity,box-shadow,background,border-color] duration-150 bg-accent text-white hover:opacity-90 hover:shadow-[0_8px_32px_rgba(129,140,248,0.25)]"
            onClick={onFileUpload}
          >
            <UploadIcon />
            파일 업로드
          </button>
          <button
            className="flex items-center justify-center gap-2 px-7 py-[14px] border rounded-xl text-[15px] font-bold cursor-pointer font-[inherit] transition-[opacity,box-shadow,background,border-color] duration-150 border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.06)] text-text hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)]"
            onClick={onStartRecording}
          >
            <MicIcon />
            바로 녹음하기
          </button>
        </div>
        <p className="text-xs text-text-dim mt-1">
          또는 오디오 파일을 여기에 드래그 앤 드롭
        </p>
      </div>
    </div>
  );
}
