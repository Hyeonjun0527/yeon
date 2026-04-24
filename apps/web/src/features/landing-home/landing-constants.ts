import { Mic, FileText, MessageSquare, FolderOpen } from "lucide-react";

export const STATS = [
  {
    label: "루트 포털",
    value: 1,
    suffix: "개",
    description:
      "서비스를 하나씩 늘려도 진입 브랜드와 공통 계정 경험은 하나로 유지합니다.",
  },
  {
    label: "공통 로그인 허브",
    value: 1,
    suffix: "곳",
    description: "계정형 서비스는 같은 로그인과 세션 정책 위에서 확장합니다.",
  },
  {
    label: "서비스 확장 슬롯",
    value: 3,
    suffix: "+",
    description:
      "상담 워크스페이스부터 타자연습, 실험형 공개 서비스까지 같은 구조로 붙입니다.",
  },
] as const;

export const FEATURES = [
  {
    icon: Mic,
    title: "루트 포털 + 서비스 레지스트리",
    description:
      "yeon.world 루트는 브랜드와 서비스 포털을 맡고, 각 서비스는 자기 slug 아래에서 독립적으로 동작합니다.",
    accent: "accent" as const,
  },
  {
    icon: MessageSquare,
    title: "공통 로그인과 계정",
    description:
      "로그인, 세션, 계정 정리는 플랫폼이 소유하고 계정이 필요한 서비스만 그 위에 올라탑니다.",
    accent: "blue" as const,
  },
  {
    icon: FileText,
    title: "서비스별 독립 SEO와 URL",
    description:
      "타자연습처럼 공개형 유입 서비스는 자기 canonical 경로와 metadata를 직접 소유합니다.",
    accent: "green" as const,
  },
  {
    icon: FolderOpen,
    title: "서비스별 깊은 경험 설계",
    description:
      "상담, 타자연습, 랭킹처럼 서로 다른 UX를 하나의 앱 안에서도 서비스 경계 기준으로 분리합니다.",
    accent: "purple" as const,
  },
] as const;

export const FLOW_STEPS = [
  {
    number: "01",
    title: "루트 포털 진입",
    description:
      "사용자는 yeon.world에서 서비스 목록, 접근 정책, 진입 경로를 먼저 확인합니다.",
  },
  {
    number: "02",
    title: "서비스 선택",
    description:
      "공개형 서비스는 바로 열고, 계정형 서비스는 해당 경로를 next로 붙여 로그인 흐름으로 보냅니다.",
  },
  {
    number: "03",
    title: "서비스별 경험 시작",
    description:
      "선택한 서비스가 자기 URL, 자기 메타데이터, 자기 UX를 기준으로 실제 기능을 실행합니다.",
  },
  {
    number: "04",
    title: "다음 서비스 확장",
    description:
      "새 서비스를 추가할 때는 루트 브랜드나 로그인 허브를 다시 뒤흔들지 않고 서비스 단위로 붙입니다.",
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
