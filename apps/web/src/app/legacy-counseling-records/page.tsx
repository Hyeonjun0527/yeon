import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CounselingRecordWorkspace } from "@/features/counseling-record-workspace";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildAuthSessionCleanupHref,
} from "@/server/auth/constants";
import { getAuthUserBySessionToken } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "YEON | 상담 기록 워크스페이스",
  description:
    "상담 녹음 기록, 원문 전체 텍스트, 구조화 요약, 원문 기반 AI 대화를 한 화면에서 다루는 교육 운영용 워크스페이스",
};

function getLoginRedirectHref() {
  return "/?login=1&next=%2Fcounseling-service";
}

export default async function CounselingRecordsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
  const currentUser = sessionToken
    ? await getAuthUserBySessionToken(sessionToken)
    : null;

  if (!currentUser) {
    redirect(
      sessionToken
        ? buildAuthSessionCleanupHref(getLoginRedirectHref())
        : getLoginRedirectHref(),
    );
  }

  return <CounselingRecordWorkspace />;
}
