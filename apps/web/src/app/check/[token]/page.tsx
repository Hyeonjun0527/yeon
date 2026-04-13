"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type {
  PublicCheckEntry,
  PublicCheckMethod,
  PublicCheckSessionPublic,
  StudentAssignmentStatus,
  SubmitPublicCheckResult,
  VerifyPublicCheckIdentityResult,
} from "@yeon/api-contract";

type PublicCheckFeedback = {
  message: string;
  matchedMemberName: string | null;
  tone: "error" | "success";
};

function resolveEntryMode(value: string | null): PublicCheckEntry {
  return value === "location" ? "location" : "qr";
}

function buildFeedback(params: {
  message: string;
  matchedMemberName: string | null;
  tone: "error" | "success";
}): PublicCheckFeedback {
  return {
    message: params.message,
    matchedMemberName: params.matchedMemberName,
    tone: params.tone,
  };
}

function getQrSubmitLabel(checkMode: PublicCheckSessionPublic["checkMode"]) {
  switch (checkMode) {
    case "attendance_only":
      return "출석 체크 완료";
    case "assignment_only":
      return "과제 체크 완료";
    case "attendance_and_assignment":
      return "출석·과제 체크 완료";
  }
}

function getQrDescription(session: PublicCheckSessionPublic | undefined) {
  if (!session) {
    return "QR 체크인을 준비하고 있습니다.";
  }

  if (session.requiresPhoneLast4) {
    return "처음 1회만 이름과 전화번호 뒤 4자리로 본인 확인하면, 같은 기기에서는 다음부터 QR만 찍어도 자동으로 진행됩니다.";
  }

  return `${
    session.rememberedMemberName ?? "확인된 수강생"
  } 님으로 확인되었습니다. 같은 기기에서는 다음부터 QR만 찍어도 자동으로 진행됩니다.`;
}

function getLocationDescription(session: PublicCheckSessionPublic | undefined) {
  if (!session) {
    return "위치 기반체크인을 준비하고 있습니다.";
  }

  return session.locationLabel
    ? `${session.locationLabel} 주변에서만 위치 기반체크인을 완료할 수 있습니다. 이름과 전화번호 뒤 4자리 확인 후 진행해 주세요.`
    : "이름과 전화번호 뒤 4자리 확인 후 위치 기반체크인을 완료해 주세요.";
}

export default function PublicCheckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const searchParams = useSearchParams();
  const entryMode = resolveEntryMode(searchParams.get("entry"));
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [assignmentStatus, setAssignmentStatus] =
    useState<StudentAssignmentStatus>("unknown");
  const [assignmentLink, setAssignmentLink] = useState("");
  const [feedback, setFeedback] = useState<PublicCheckFeedback | null>(null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    void params.then((value) => setTokenState(value.token));
  }, [params]);

  const sessionQuery = useQuery({
    queryKey: ["public-check-session", tokenState, entryMode],
    enabled: !!tokenState,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/public-check-sessions/${tokenState}?entry=${entryMode}`,
      );
      const payload = (await response.json().catch(() => null)) as
        | ({ message?: string } & Partial<PublicCheckSessionPublic>)
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.message || "체크인 세션을 불러오지 못했습니다.",
        );
      }

      return payload as PublicCheckSessionPublic;
    },
  });

  const session = sessionQuery.data;
  const method: PublicCheckMethod =
    entryMode === "location" ? "location" : "qr";
  const supportsCurrentEntry = session
    ? session.enabledMethods.includes(method)
    : true;
  const needsIdentityVerification =
    entryMode === "location" || Boolean(session?.requiresPhoneLast4);
  const canShowAssignmentFields =
    !!session &&
    session.checkMode !== "attendance_only" &&
    (entryMode === "location" || !session.requiresPhoneLast4);
  const isQrAttendanceAutoReady =
    entryMode === "qr" &&
    !!session &&
    session.checkMode === "attendance_only" &&
    !session.requiresPhoneLast4 &&
    supportsCurrentEntry;

  async function resolveLocationIfNeeded(currentMethod: PublicCheckMethod) {
    if (currentMethod !== "location") {
      return { latitude: null, longitude: null };
    }

    return new Promise<{ latitude: number; longitude: number }>(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("이 브라우저는 위치 정보를 지원하지 않습니다."));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          () =>
            reject(
              new Error("위치 권한을 허용해야 위치 기반 체크인이 가능합니다."),
            ),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      },
    );
  }

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!tokenState) {
        throw new Error("체크인 세션을 찾지 못했습니다.");
      }

      const response = await fetch(
        `/api/v1/public-check-sessions/${tokenState}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phoneLast4,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ({ message?: string } & Partial<VerifyPublicCheckIdentityResult>)
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "본인 확인을 처리하지 못했습니다.");
      }

      return payload as VerifyPublicCheckIdentityResult;
    },
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async (payload) => {
      if (payload.verificationStatus !== "matched") {
        setFeedback(
          buildFeedback({
            message: payload.message,
            matchedMemberName: payload.matchedMemberName,
            tone: "error",
          }),
        );
        return;
      }

      setFeedback(
        buildFeedback({
          message: payload.message,
          matchedMemberName: payload.matchedMemberName,
          tone: "success",
        }),
      );
      await sessionQuery.refetch();
    },
    onError: (error) => {
      setFeedback(
        buildFeedback({
          message:
            error instanceof Error
              ? error.message
              : "본인 확인을 처리하지 못했습니다.",
          matchedMemberName: null,
          tone: "error",
        }),
      );
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!tokenState) {
        throw new Error("체크인 세션을 찾지 못했습니다.");
      }

      const location = await resolveLocationIfNeeded(method);
      const response = await fetch(
        `/api/v1/public-check-sessions/${tokenState}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method,
            name: needsIdentityVerification ? name.trim() || null : null,
            phoneLast4: needsIdentityVerification ? phoneLast4 || null : null,
            assignmentStatus:
              session?.checkMode === "attendance_only"
                ? undefined
                : assignmentStatus,
            assignmentLink:
              session?.checkMode === "attendance_only"
                ? undefined
                : assignmentLink.trim() || null,
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ({ message?: string } & Partial<SubmitPublicCheckResult>)
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "체크인을 처리하지 못했습니다.");
      }

      return payload as SubmitPublicCheckResult;
    },
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: (payload) => {
      setFeedback(
        buildFeedback({
          message: payload.message,
          matchedMemberName: payload.matchedMemberName,
          tone: payload.verificationStatus === "matched" ? "success" : "error",
        }),
      );
    },
    onError: (error) => {
      setFeedback(
        buildFeedback({
          message:
            error instanceof Error
              ? error.message
              : "체크인을 처리하지 못했습니다.",
          matchedMemberName: null,
          tone: "error",
        }),
      );
    },
  });

  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [tokenState, entryMode, session?.requiresPhoneLast4, session?.checkMode]);

  useEffect(() => {
    if (
      !isQrAttendanceAutoReady ||
      !session ||
      submitMutation.isPending ||
      autoSubmittedRef.current
    ) {
      return;
    }

    autoSubmittedRef.current = true;
    void submitMutation.mutateAsync();
  }, [isQrAttendanceAutoReady, session, submitMutation]);

  const isBusy = verifyMutation.isPending || submitMutation.isPending;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-6 text-text sm:py-10">
      <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-6">
        <h1 className="mb-2 text-2xl font-bold">
          {session?.title ?? "출석 · 과제 체크"}
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-text-secondary">
          {entryMode === "location"
            ? getLocationDescription(session)
            : getQrDescription(session)}
        </p>

        {sessionQuery.isPending ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <LoaderCircle size={14} className="animate-spin text-text-dim" />
            체크인 세션을 불러오는 중...
          </div>
        ) : null}
        {sessionQuery.error instanceof Error ? (
          <p className="text-sm text-red-300">{sessionQuery.error.message}</p>
        ) : null}

        {session && !supportsCurrentEntry ? (
          <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {entryMode === "location"
              ? "이 세션은 위치 기반체크인을 지원하지 않습니다."
              : "이 세션은 QR 체크인을 지원하지 않습니다."}
          </p>
        ) : null}

        {session && supportsCurrentEntry ? (
          <div className="space-y-4">
            {entryMode === "qr" && !session.requiresPhoneLast4 ? (
              <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-secondary">
                <div className="font-semibold text-text">
                  {session.rememberedMemberName ?? "확인된 수강생"} 님으로 자동
                  확인되었습니다.
                </div>
                <div className="mt-1">
                  같은 기기에서는 다음부터 QR만 찍어도 바로 진행됩니다.
                </div>
              </div>
            ) : null}

            {needsIdentityVerification ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                  placeholder="이름"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <input
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                  placeholder="전화번호 뒤 4자리"
                  inputMode="numeric"
                  maxLength={4}
                  value={phoneLast4}
                  onChange={(event) =>
                    setPhoneLast4(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                />
              </div>
            ) : null}

            {canShowAssignmentFields ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                  value={assignmentStatus}
                  onChange={(event) =>
                    setAssignmentStatus(
                      event.target.value as StudentAssignmentStatus,
                    )
                  }
                >
                  <option value="unknown">과제 상태 선택</option>
                  <option value="done">과제 완료</option>
                  <option value="not_done">아직 못함</option>
                </select>
                <input
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                  placeholder="과제 링크 (선택)"
                  value={assignmentLink}
                  onChange={(event) => setAssignmentLink(event.target.value)}
                />
              </div>
            ) : null}

            {isQrAttendanceAutoReady ? (
              <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <LoaderCircle
                    size={14}
                    className="animate-spin text-text-dim"
                  />
                  자동으로 출석 체크를 완료하는 중입니다.
                </div>
              </div>
            ) : null}

            {!isQrAttendanceAutoReady ? (
              <div className="sticky bottom-3 z-10 -mx-1 rounded-2xl bg-[rgba(10,10,10,0.82)] p-1 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
                {entryMode === "qr" && session.requiresPhoneLast4 ? (
                  <button
                    className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={isBusy || !name.trim() || phoneLast4.length !== 4}
                    onClick={() => verifyMutation.mutate()}
                  >
                    {verifyMutation.isPending ? "확인 중..." : "본인 확인"}
                  </button>
                ) : (
                  <button
                    className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={
                      isBusy ||
                      (entryMode === "location" &&
                        (!name.trim() || phoneLast4.length !== 4)) ||
                      sessionQuery.isPending
                    }
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending
                      ? "처리 중..."
                      : entryMode === "location"
                        ? "위치 기반체크인"
                        : getQrSubmitLabel(session.checkMode)}
                  </button>
                )}
              </div>
            ) : null}

            {feedback ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  feedback.tone === "success"
                    ? "border-accent/20 bg-accent/10 text-text-secondary"
                    : "border-red-400/20 bg-red-400/10 text-red-100"
                }`}
              >
                <div
                  className={
                    feedback.tone === "success"
                      ? "font-semibold text-text"
                      : "font-semibold text-red-100"
                  }
                >
                  {feedback.message}
                </div>
                {feedback.matchedMemberName ? (
                  <div className="mt-1">
                    확인된 수강생: {feedback.matchedMemberName}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
