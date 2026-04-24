import type { Metadata } from "next";
import Link from "next/link";

import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";
import { SITE_BRAND_NAME } from "@/lib/site-brand";
import { AuthShell } from "@/features/auth-credentials/auth-shell";
import { ResetRequestForm } from "@/features/auth-credentials/reset-request-form";

export const metadata: Metadata = {
  title: `비밀번호 재설정 | ${SITE_BRAND_NAME}`,
  robots: NON_INDEXABLE_ROBOTS,
};

export default function ResetRequestPage() {
  return (
    <AuthShell
      eyebrow="Reset password"
      title="비밀번호 재설정 요청"
      description="가입한 이메일로 재설정 링크를 보내드립니다."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/70">
          <Link
            href="/auth/login"
            className="underline-offset-4 hover:underline"
          >
            로그인으로 돌아가기
          </Link>
          <Link
            href="/auth/register"
            className="underline-offset-4 hover:underline"
          >
            계정이 없나요? 가입
          </Link>
        </div>
      }
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
