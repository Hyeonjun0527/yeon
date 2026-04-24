import type { Metadata } from "next";
import Link from "next/link";

import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";
import { SITE_BRAND_NAME } from "@/lib/site-brand";
import { AuthShell } from "@/features/auth-credentials/auth-shell";

export const metadata: Metadata = {
  title: `이메일 인증 완료 | ${SITE_BRAND_NAME}`,
  robots: NON_INDEXABLE_ROBOTS,
};

export default function AuthVerifiedPage() {
  return (
    <AuthShell
      eyebrow="Verified"
      title="이메일 인증이 완료되었어요"
      description="이제 이메일과 비밀번호로 로그인할 수 있습니다."
      footer={
        <Link
          href="/auth/login"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#e8630a] px-[22px] text-[15px] font-bold text-[#fffaf4] transition-transform duration-200 ease-[ease] hover:-translate-y-px"
        >
          로그인
        </Link>
      }
    >
      <p className="m-0 text-[13px] leading-[1.65] text-white/60">
        이미 로그인된 상태라면 자동으로 이용이 가능합니다. 로그아웃된 상태라면
        로그인 버튼을 눌러 주세요.
      </p>
    </AuthShell>
  );
}
