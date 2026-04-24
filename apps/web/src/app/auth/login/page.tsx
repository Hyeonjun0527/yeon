import type { Metadata } from "next";
import Link from "next/link";

import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";
import { SITE_BRAND_NAME } from "@/lib/site-brand";
import { normalizeAuthRedirectPath } from "@/server/auth/constants";
import { AuthShell } from "@/features/auth-credentials/auth-shell";
import { LoginForm } from "@/features/auth-credentials/login-form";

export const metadata: Metadata = {
  title: `이메일 로그인 | ${SITE_BRAND_NAME}`,
  robots: NON_INDEXABLE_ROBOTS,
};

type PageProps = {
  searchParams: Promise<{
    next?: string | string[];
    resetOk?: string | string[];
  }>;
};

function pickFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CredentialLoginPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const nextPath = normalizeAuthRedirectPath(pickFirst(resolved.next));
  const showResetSuccess = pickFirst(resolved.resetOk) === "1";

  return (
    <AuthShell
      eyebrow="Sign in"
      title="이메일로 로그인"
      description="가입한 이메일과 비밀번호로 로그인하세요."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/70">
          <Link
            href={`/auth/register?next=${encodeURIComponent(nextPath)}`}
            className="font-bold text-white/85 underline-offset-4 hover:underline"
          >
            계정 만들기
          </Link>
          <Link
            href="/auth/reset-request"
            className="underline-offset-4 hover:underline"
          >
            비밀번호 찾기
          </Link>
          <Link
            href={`/?login=1&next=${encodeURIComponent(nextPath)}`}
            className="underline-offset-4 hover:underline"
          >
            소셜 로그인으로 돌아가기
          </Link>
        </div>
      }
    >
      {showResetSuccess ? (
        <div
          role="status"
          className="grid gap-1 rounded-[16px] border border-white/[0.1] bg-[rgba(232,99,10,0.12)] p-4 text-[13px] leading-[1.55] text-[#ffd1a3]"
        >
          <p className="m-0 font-bold">비밀번호가 재설정되었습니다.</p>
          <p className="m-0">새 비밀번호로 로그인해 주세요.</p>
        </div>
      ) : null}
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
