import {
  DEFAULT_POST_LOGIN_PATH,
  normalizeAuthRedirectPath,
  type SocialProvider,
} from "./constants";

export const authErrorCodes = {
  providerDenied: "provider_denied",
  invalidState: "invalid_state",
  missingCode: "missing_code",
  providerNotConfigured: "provider_not_configured",
  oauthExchangeFailed: "oauth_exchange_failed",
  profileFetchFailed: "profile_fetch_failed",
  emailRequired: "email_required",
  emailNotVerified: "email_not_verified",
  providerConflict: "provider_conflict",
  invalidCredentials: "invalid_credentials",
  passwordPolicyViolation: "password_policy_violation",
  emailAlreadyRegistered: "email_already_registered",
  accountLocked: "account_locked",
  rateLimitExceeded: "rate_limit_exceeded",
  invalidVerificationToken: "invalid_verification_token",
  invalidResetToken: "invalid_reset_token",
  serverError: "server_error",
} as const;

export type AuthErrorCode =
  (typeof authErrorCodes)[keyof typeof authErrorCodes];

const authErrorCodeSet = new Set<AuthErrorCode>(Object.values(authErrorCodes));

export class AuthFlowError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthFlowError";
  }
}

function getProviderLabel(provider?: string | null) {
  if (provider === "google") {
    return "구글";
  }

  if (provider === "kakao") {
    return "카카오";
  }

  return "소셜";
}

export function isAuthErrorCode(
  value: string | null | undefined,
): value is AuthErrorCode {
  return value ? authErrorCodeSet.has(value as AuthErrorCode) : false;
}

export function getAuthErrorCopy(
  reason: string | null | undefined,
  provider?: string | null,
) {
  const normalizedReason = isAuthErrorCode(reason)
    ? reason
    : authErrorCodes.serverError;
  const providerLabel = getProviderLabel(provider);

  switch (normalizedReason) {
    case authErrorCodes.providerDenied:
      return {
        reason: normalizedReason,
        title: `${providerLabel} 로그인 동의가 완료되지 않았어요`,
        description:
          "로그인을 취소했거나 동의가 중간에 종료되었습니다. 다시 시도하면 바로 이어서 진행할 수 있어요.",
      };
    case authErrorCodes.invalidState:
      return {
        reason: normalizedReason,
        title: "로그인 요청이 만료되었어요",
        description:
          "브라우저의 로그인 상태를 확인할 수 없었습니다. 다시 시작하면 새로운 인증 요청으로 이어집니다.",
      };
    case authErrorCodes.missingCode:
      return {
        reason: normalizedReason,
        title: "인증 응답이 올바르지 않아요",
        description:
          "공급자에서 필요한 인증 코드를 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    case authErrorCodes.providerNotConfigured:
      return {
        reason: normalizedReason,
        title: `${providerLabel} 로그인 설정이 아직 완료되지 않았어요`,
        description:
          "클라이언트 ID, 시크릿, 리다이렉트 URI 설정을 먼저 맞춰야 합니다. 설정 후 다시 로그인할 수 있습니다.",
      };
    case authErrorCodes.oauthExchangeFailed:
      return {
        reason: normalizedReason,
        title: `${providerLabel} 인증 토큰을 발급하지 못했어요`,
        description:
          "공급자 인증 서버와 토큰 교환이 실패했습니다. 앱 설정과 리다이렉트 URI를 다시 확인해 주세요.",
      };
    case authErrorCodes.profileFetchFailed:
      return {
        reason: normalizedReason,
        title: "프로필 정보를 가져오지 못했어요",
        description:
          "로그인 자체는 시작됐지만 계정 정보를 읽지 못했습니다. 다시 시도하거나 공급자 권한 동의를 확인해 주세요.",
      };
    case authErrorCodes.emailRequired:
      return {
        reason: normalizedReason,
        title: "이메일 제공 동의가 필요해요",
        description:
          "현재 서비스는 계정 식별과 중복 가입 방지를 위해 이메일이 꼭 필요합니다. 이메일 동의를 허용한 뒤 다시 로그인해 주세요.",
      };
    case authErrorCodes.emailNotVerified:
      return {
        reason: normalizedReason,
        title: "검증된 이메일 계정만 로그인할 수 있어요",
        description:
          "공급자에서 인증된 이메일을 확인하지 못했습니다. 이메일이 인증된 계정으로 다시 시도해 주세요.",
      };
    case authErrorCodes.providerConflict:
      return {
        reason: normalizedReason,
        title: "같은 공급자에 다른 계정이 이미 연결되어 있어요",
        description:
          "기존에 연결된 동일 공급자 계정과 현재 로그인한 계정이 다릅니다. 같은 계정으로 다시 시도해 주세요.",
      };
    case authErrorCodes.invalidCredentials:
      return {
        reason: normalizedReason,
        title: "이메일 또는 비밀번호가 올바르지 않아요",
        description:
          "입력한 정보를 다시 확인해 주세요. 비밀번호가 기억나지 않으면 재설정을 이용할 수 있습니다.",
      };
    case authErrorCodes.passwordPolicyViolation:
      return {
        reason: normalizedReason,
        title: "비밀번호 형식이 올바르지 않아요",
        description:
          "최소 8자 이상 72자 이하로, 공백 없이 입력해 주세요.",
      };
    case authErrorCodes.emailAlreadyRegistered:
      return {
        reason: normalizedReason,
        title: "이미 가입된 이메일이에요",
        description:
          "기존 계정으로 로그인하거나 비밀번호 재설정을 이용해 주세요.",
      };
    case authErrorCodes.accountLocked:
      return {
        reason: normalizedReason,
        title: "로그인 시도가 너무 많아 잠시 잠겨 있어요",
        description:
          "잠시 후 다시 시도하거나, 비밀번호 재설정으로 계정을 복구할 수 있습니다.",
      };
    case authErrorCodes.rateLimitExceeded:
      return {
        reason: normalizedReason,
        title: "요청이 너무 많아요",
        description: "잠시 후 다시 시도해 주세요.",
      };
    case authErrorCodes.invalidVerificationToken:
      return {
        reason: normalizedReason,
        title: "인증 링크가 만료되었거나 사용할 수 없어요",
        description:
          "새로운 인증 메일을 다시 받아 진행해 주세요.",
      };
    case authErrorCodes.invalidResetToken:
      return {
        reason: normalizedReason,
        title: "비밀번호 재설정 링크가 만료되었거나 사용할 수 없어요",
        description:
          "비밀번호 재설정을 다시 요청해 주세요.",
      };
    default:
      return {
        reason: normalizedReason,
        title: "로그인 처리 중 오류가 발생했어요",
        description:
          "예상하지 못한 문제가 발생했습니다. 잠시 후 다시 시도해 주세요. 문제가 계속되면 설정 상태를 함께 확인해야 합니다.",
      };
  }
}

export function buildAuthErrorRedirectPath(options: {
  provider?: SocialProvider;
  reason: AuthErrorCode;
  nextPath?: string | null;
}) {
  const url = new URL("/auth/error", "https://yeon.world");

  url.searchParams.set("reason", options.reason);

  if (options.provider) {
    url.searchParams.set("provider", options.provider);
  }

  const nextPath = normalizeAuthRedirectPath(options.nextPath);

  if (nextPath !== DEFAULT_POST_LOGIN_PATH) {
    url.searchParams.set("next", nextPath);
  }

  return `${url.pathname}${url.search}`;
}
