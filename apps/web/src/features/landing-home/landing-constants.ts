import {
  Mic,
  FileText,
  MessageSquare,
  FolderOpen,
} from "lucide-react";

export const STATS = [
  { label: "원문 전체 열람", value: 100, suffix: "%" },
  { label: "요약 기본 구조", value: 4, suffix: "개" },
  { label: "한 화면 작업 영역", value: 3, suffix: "영역" },
] as const;

export const FEATURES = [
  {
    icon: Mic,
    title: "고품질 STT 원문",
    description:
      "긴 상담 녹음도 흐름이 끊기지 않게 텍스트로 펼쳐 보여줍니다. 요약 전에 원문을 먼저 확인할 수 있습니다.",
    accent: "orange" as const,
  },
  {
    icon: FileText,
    title: "구조화 상담 요약",
    description:
      "핵심 상담 내용, 학생 문제 포인트, 보호자 요청사항, 다음 액션을 실무형 구조로 나눠 정리합니다.",
    accent: "blue" as const,
  },
  {
    icon: MessageSquare,
    title: "원문 기반 AI 채팅",
    description:
      "선택한 상담 원문을 기준으로 요청사항 추출, 다음 상담 준비, 특정 주제 검색을 빠르게 처리합니다.",
    accent: "green" as const,
  },
  {
    icon: FolderOpen,
    title: "학생별 상담 히스토리",
    description:
      "상담 기록이 학생 단위로 쌓여 이전 약속, 후속 액션, 보호자 요청 맥락을 이어서 볼 수 있습니다.",
    accent: "purple" as const,
  },
] as const;

export const FLOW_STEPS = [
  {
    number: "01",
    title: "로그인",
    description: "상담 기록 서비스에 로그인하고 작업 화면을 엽니다.",
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
