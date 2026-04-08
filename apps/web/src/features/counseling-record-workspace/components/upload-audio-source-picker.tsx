import { Mic, Upload } from "lucide-react";
import styles from "../counseling-record-workspace.module.css";

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
    <div className={styles.primaryCtaStack}>
      <button
        type="button"
        className={styles.primaryCtaTile}
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload size={20} strokeWidth={2} />
        <div>
          <span className={styles.primaryCtaTileTitle}>파일 업로드</span>
          <span className={styles.primaryCtaTileDescription}>
            오디오 파일에서 시작
          </span>
        </div>
      </button>
      <button
        type="button"
        className={styles.primaryCtaTile}
        onClick={onStartRecording}
        disabled={isUploading}
      >
        <Mic size={20} strokeWidth={2} />
        <div>
          <span className={styles.primaryCtaTileTitle}>바로 녹음하기</span>
          <span className={styles.primaryCtaTileDescription}>
            지금 바로 녹음 시작
          </span>
        </div>
      </button>
    </div>
  );
}
