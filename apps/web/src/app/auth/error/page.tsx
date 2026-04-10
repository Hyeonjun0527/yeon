import Link from "next/link";

import { getAuthErrorCopy } from "@/server/auth/auth-errors";
import { normalizeAuthRedirectPath } from "@/server/auth/constants";

type AuthErrorPageProps = {
  searchParams: Promise<{
    reason?: string | string[];
    provider?: string | string[];
    next?: string | string[];
  }>;
};

function pickFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const resolvedSearchParams = await searchParams;
  const reason = pickFirstValue(resolvedSearchParams.reason);
  const provider = pickFirstValue(resolvedSearchParams.provider);
  const nextPath = normalizeAuthRedirectPath(
    pickFirstValue(resolvedSearchParams.next),
  );
  const copy = getAuthErrorCopy(reason, provider);
  const retryHref = `/?login=1&next=${encodeURIComponent(nextPath)}`;

  return (
    <main
      className="min-h-screen text-[#f8f7f3]"
      style={{
        background:
          "radial-gradient(circle at top, rgba(232,99,10,0.16), transparent 28%), linear-gradient(180deg, #080808 0%, #0f0f11 100%)",
      }}
    >
      <div
        className="w-[min(720px,calc(100%-32px))] mx-auto min-h-screen grid place-items-center py-10"
      >
        <section
          className="w-full grid gap-6 p-8 rounded-[28px] border border-white/[0.08] bg-[rgba(16,17,20,0.88)] shadow-[0_28px_80px_rgba(0,0,0,0.32)] md:p-6"
        >
          <div>
            <p className="m-0 text-xs font-bold tracking-[0.16em] uppercase text-white/[0.58]">
              Authentication Error
            </p>
            <h1
              className="m-0 leading-[0.96] tracking-[-0.05em]"
              style={{ fontSize: "clamp(30px, 6vw, 52px)" }}
            >
              {copy.title}
            </h1>
          </div>
          <p className="m-0 text-base leading-[1.75] text-white/[0.74]">
            {copy.description}
          </p>
          <p className="m-0 text-[13px] leading-relaxed text-white/50">
            문제가 반복되면 공급자 콘솔의 리다이렉트 URI와 환경변수 설정을 함께
            확인해야 합니다.
          </p>
          <div className="flex flex-wrap gap-3 md:flex-col">
            <Link
              href={retryHref}
              className="min-h-[52px] px-[22px] rounded-full inline-flex items-center justify-center font-bold transition-transform duration-200 ease-[ease] hover:-translate-y-px bg-[#e8630a] text-[#fffaf4]"
            >
              다시 로그인
            </Link>
            <Link
              href="/"
              className="min-h-[52px] px-[22px] rounded-full inline-flex items-center justify-center font-bold transition-transform duration-200 ease-[ease] hover:-translate-y-px border border-white/[0.12] text-white/[0.88] bg-white/[0.04]"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
