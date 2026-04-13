import { Mic, FileText, MessageSquare, FolderOpen } from "lucide-react";

export const STATS = [
  {
    label: "녹음 인식 완성도",
    value: 99.9,
    suffix: "%",
    description:
      "상담기록의 출발점인 원문을 빠르게 남겨 흐름이 끊기지 않게 합니다.",
  },
  {
    label: "수강생 정보 추출",
    value: 3,
    suffix: "초",
    description:
      "AI가 상담 기록과 업로드 자료를 바탕으로 필요한 수강생 정보를 바로 정리합니다.",
  },
  {
    label: "엑셀·워드 보고서",
    value: 1,
    suffix: "클릭",
    description:
      "정리된 상담기록을 운영 공유용 문서로 바로 내보내 다음 작업까지 이어집니다.",
  },
] as const;

export const FEATURES = [
  {
    icon: Mic,
    title: "고정밀 STT 원문",
    description:
      "긴 상담 녹음도 흐름이 끊기지 않게 원문으로 펼쳐 보여줍니다. 요약보다 먼저, 상담기록의 본체를 정확하게 확인할 수 있습니다.",
    accent: "accent" as const,
  },
  {
    icon: MessageSquare,
    title: "AI 수강생 관리 보조",
    description:
      "상담 내용과 업로드 자료를 바탕으로 수강생 정보, 핵심 이슈, 다음 관리 포인트를 빠르게 정리합니다.",
    accent: "blue" as const,
  },
  {
    icon: FileText,
    title: "문서 자동화",
    description:
      "정리된 상담기록을 엑셀·워드 보고서로 바로 내보내 운영 공유와 후속 조치를 더 빠르게 마무리합니다.",
    accent: "green" as const,
  },
  {
    icon: FolderOpen,
    title: "상담 히스토리 누적",
    description:
      "수강생별 상담기록이 누적되어 이전 약속, 변화 흐름, 다음 상담 맥락을 이어서 볼 수 있습니다.",
    accent: "purple" as const,
  },
] as const;

export const FLOW_STEPS = [
  {
    number: "01",
    title: "데모 보기 또는 로그인",
    description:
      "평가용 데모로 바로 들어가거나 소셜 로그인으로 실제 작업 화면을 엽니다.",
  },
  {
    number: "02",
    title: "상담 선택 또는 업로드",
    description: "왼쪽 리스트에서 기존 상담을 고르거나 새 녹음본을 올립니다.",
  },
  {
    number: "03",
    title: "원문과 요약 생성",
    description:
      "STT가 전체 원문을 만들고 AI가 핵심 상담 내용과 다음 액션 초안을 정리합니다.",
  },
  {
    number: "04",
    title: "다음 상담 준비",
    description:
      "가운데 원문을 검토하고 오른쪽 AI 채팅으로 필요한 부분만 다시 묻고 저장합니다.",
  },
] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
