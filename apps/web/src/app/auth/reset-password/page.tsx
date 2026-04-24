import type { Metadata } from "next";
import Link from "next/link";

import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";
import { SITE_BRAND_NAME } from "@/lib/site-brand";
import { AuthShell } from "@/features/auth-credentials/auth-shell";
import { ResetPasswordForm } from "@/features/auth-credentials/reset-password-form";

export const metadata: Metadata = {
  title: `비밀번호 재설정 | ${SITE_BRAND_NAME}`,
  robots: NON_INDEXABLE_ROBOTS,
};

type PageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

function pickFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const token = pickFirst(resolved.token) ?? "";

  if (!token) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="재설정 링크가 올바르지 않아요"
        description="메일에서 받은 재설정 링크를 다시 눌러주세요. 링크가 만료되었다면 재설정을 다시 요청할 수 있습니다."
        footer={
          <Link
            href="/auth/reset-request"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.04] px-5 text-[14px] font-bold text-white/90 transition-transform duration-200 ease-[ease] hover:-translate-y-px"
          >
            재설정 다시 요청하기
          </Link>
        }
      >
        <p className="m-0 text-[13px] leading-[1.65] text-white/60">
          브라우저 주소창의 token 값이 잘려 있거나 비어 있으면 메일 링크를 다시
          눌러 주세요.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="새 비밀번호 설정"
      description="새로 사용할 비밀번호를 입력하세요. 설정 후에는 기존 모든 기기의 로그인이 해제됩니다."
      footer={
        <Link
          href="/auth/login"
          className="text-[13px] text-white/70 underline-offset-4 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
