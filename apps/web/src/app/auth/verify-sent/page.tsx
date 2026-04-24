import type { Metadata } from "next";
import Link from "next/link";

import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";
import { SITE_BRAND_NAME } from "@/lib/site-brand";
import { AuthShell } from "@/features/auth-credentials/auth-shell";
import { ResendVerificationForm } from "@/features/auth-credentials/resend-verification-form";

export const metadata: Metadata = {
  title: `인증 메일 발송 | ${SITE_BRAND_NAME}`,
  robots: NON_INDEXABLE_ROBOTS,
};

type PageProps = {
  searchParams: Promise<{
    email?: string | string[];
  }>;
};

function pickFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifySentPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const email = pickFirst(resolved.email) ?? "";

  return (
    <AuthShell
      eyebrow="Check your inbox"
      title="인증 메일을 확인해 주세요"
      description={
        email
          ? `${email} 주소로 인증 링크를 발송했습니다. 메일에 있는 링크를 누르면 가입이 완료됩니다.`
          : "입력한 이메일 주소로 인증 링크를 발송했습니다. 메일에 있는 링크를 누르면 가입이 완료됩니다."
      }
      footer={
        <Link
          href="/auth/login"
          className="text-[13px] text-white/70 underline-offset-4 hover:underline"
        >
          이미 인증을 완료했다면 로그인
        </Link>
      }
    >
      <div className="grid gap-4">
        <p className="m-0 text-[13px] leading-[1.65] text-white/[0.74]">
          메일이 도착하지 않거나 링크가 만료되었다면 아래에서 다시 요청할 수
          있어요. 스팸함도 함께 확인해 주세요.
        </p>
        <ResendVerificationForm initialEmail={email} />
      </div>
    </AuthShell>
  );
}
