export const platformServiceAccessPolicies = {
  anonymous: "anonymous",
  authRequired: "auth-required",
  mixed: "mixed",
} as const;

export type PlatformServiceAccessPolicy =
  (typeof platformServiceAccessPolicies)[keyof typeof platformServiceAccessPolicies];

export const platformServiceStatuses = {
  live: "live",
  planned: "planned",
} as const;

export type PlatformServiceStatus =
  (typeof platformServiceStatuses)[keyof typeof platformServiceStatuses];

export type PlatformServiceDescriptor = {
  slug: string;
  href: string;
  title: string;
  summary: string;
  audience: string;
  accessPolicy: PlatformServiceAccessPolicy;
  status: PlatformServiceStatus;
};

export const PLATFORM_SERVICES = [
  {
    slug: "counseling-service",
    href: "/counseling-service",
    title: "상담 기록 워크스페이스",
    summary:
      "녹음 업로드, 원문 열람, 구조화 요약, AI 질의를 하나의 워크스페이스에서 다룹니다.",
    audience: "교육 운영자 · 멘토",
    accessPolicy: platformServiceAccessPolicies.authRequired,
    status: platformServiceStatuses.live,
  },
  {
    slug: "typing-service",
    href: "/typing-service",
    title: "키보드 타자연습",
    summary:
      "로그인 없이 바로 시작해 정확도와 타수를 확인할 수 있는 공개형 타자연습 서비스입니다.",
    audience: "대중형 바이럴 서비스",
    accessPolicy: platformServiceAccessPolicies.anonymous,
    status: platformServiceStatuses.live,
  },
  {
    slug: "card-service",
    href: "/card-service",
    title: "플래시카드 덱",
    summary:
      "내 덱을 만들고 카드를 추가해 앞뒷면을 뒤집으며 학습하는 개인용 플래시카드 서비스입니다.",
    audience: "개인 학습자",
    accessPolicy: platformServiceAccessPolicies.authRequired,
    status: platformServiceStatuses.live,
  },
] as const satisfies readonly PlatformServiceDescriptor[];

export const PLATFORM_HOME_HREF = "/";
export const DEFAULT_COUNSELING_SERVICE_HREF = "/counseling-service";

export function getPlatformServices() {
  return PLATFORM_SERVICES;
}

export function getPlatformServiceBySlug(slug: string) {
  return PLATFORM_SERVICES.find((service) => service.slug === slug) ?? null;
}

export function getPlatformServiceByPathname(pathname: string) {
  return (
    PLATFORM_SERVICES.find(
      (service) =>
        pathname === service.href || pathname.startsWith(`${service.href}/`),
    ) ?? null
  );
}

export function serviceRequiresAuthentication(
  service: Pick<PlatformServiceDescriptor, "accessPolicy"> | null | undefined,
) {
  return service?.accessPolicy === platformServiceAccessPolicies.authRequired;
}
