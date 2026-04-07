import Link from "next/link";

import { getAuthErrorCopy } from "@/server/auth/auth-errors";
import { normalizeAuthRedirectPath } from "@/server/auth/constants";

import styles from "./page.module.css";

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
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card}>
          <div>
            <p className={styles.eyebrow}>Authentication Error</p>
            <h1 className={styles.title}>{copy.title}</h1>
          </div>
          <p className={styles.description}>{copy.description}</p>
          <p className={styles.meta}>
            문제가 반복되면 공급자 콘솔의 리다이렉트 URI와 환경변수 설정을 함께
            확인해야 합니다.
          </p>
          <div className={styles.actions}>
            <Link href={retryHref} className={styles.primaryAction}>
              다시 로그인
            </Link>
            <Link href="/" className={styles.ghostAction}>
              홈으로 돌아가기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
