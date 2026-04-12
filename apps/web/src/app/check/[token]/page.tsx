"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  PublicCheckMethod,
  PublicCheckSessionPublic,
  SubmitPublicCheckBody,
  SubmitPublicCheckResult,
} from "@yeon/api-contract";

export default function PublicCheckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [form, setForm] = useState<SubmitPublicCheckBody>({
    method: "qr",
    name: "",
    phoneLast4: "",
    assignmentStatus: "unknown",
    assignmentLink: null,
    latitude: null,
    longitude: null,
  });
  const [result, setResult] = useState<SubmitPublicCheckResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void params.then((value) => setTokenState(value.token));
  }, [params]);

  const sessionQuery = useQuery({
    queryKey: ["public-check-session", tokenState],
    enabled: !!tokenState,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/public-check-sessions/${tokenState}`,
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

  async function resolveLocationIfNeeded(method: PublicCheckMethod) {
    if (method !== "location") {
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

  const handleSubmit = async () => {
    if (!tokenState) {
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);
      const location = await resolveLocationIfNeeded(form.method);
      const response = await fetch(
        `/api/v1/public-check-sessions/${tokenState}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
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

      setResult(payload as SubmitPublicCheckResult);
    } catch (error) {
      setResult({
        verificationStatus: "not_found",
        message:
          error instanceof Error
            ? error.message
            : "체크인을 처리하지 못했습니다.",
        matchedMemberName: null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-6 text-text sm:py-10">
      <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-6">
        <h1 className="mb-2 text-2xl font-bold">
          {session?.title ?? "출석 · 과제 체크"}
        </h1>
        <p className="mb-5 text-sm text-text-secondary">
          이름과 전화번호 뒤 4자리로 본인 확인 후 체크인을 완료해 주세요.
        </p>

        {sessionQuery.isPending ? <p>세션 정보를 불러오는 중...</p> : null}
        {sessionQuery.error instanceof Error ? (
          <p className="text-sm text-red-300">{sessionQuery.error.message}</p>
        ) : null}

        {session ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                placeholder="이름"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                placeholder="전화번호 뒤 4자리"
                inputMode="numeric"
                maxLength={4}
                value={form.phoneLast4}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    phoneLast4: event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4),
                  }))
                }
              />
            </div>

            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="mb-2 text-sm font-semibold">체크인 방식 선택</div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {session.enabledMethods.map((method) => (
                  <button
                    type="button"
                    key={method}
                    className={`rounded-xl px-3 py-2 text-sm text-left ${
                      form.method === method
                        ? "bg-accent text-white"
                        : "border border-border text-text-secondary"
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, method }))}
                  >
                    {method === "qr"
                      ? "QR/링크 체크인"
                      : `위치 기반 체크인${session.locationLabel ? ` · ${session.locationLabel}` : ""}`}
                  </button>
                ))}
              </div>
            </div>

            {session.checkMode !== "attendance_only" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                  value={form.assignmentStatus ?? "unknown"}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      assignmentStatus: event.target
                        .value as SubmitPublicCheckBody["assignmentStatus"],
                    }))
                  }
                >
                  <option value="unknown">과제 상태 선택</option>
                  <option value="done">과제 완료</option>
                  <option value="not_done">아직 못함</option>
                </select>
                <input
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
                  placeholder="과제 링크 (선택)"
                  value={form.assignmentLink ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      assignmentLink: event.target.value || null,
                    }))
                  }
                />
              </div>
            ) : null}

            <div className="sticky bottom-3 z-10 -mx-1 rounded-2xl bg-[rgba(10,10,10,0.82)] p-1 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
              <button
                className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                disabled={
                  submitting ||
                  !form.name.trim() ||
                  form.phoneLast4.length !== 4 ||
                  sessionQuery.isPending
                }
                onClick={handleSubmit}
              >
                {submitting
                  ? "처리 중..."
                  : form.method === "location"
                    ? "위치 확인 후 체크인"
                    : "체크인 완료"}
              </button>
            </div>

            {result ? (
              <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                <div className="font-semibold text-text">{result.message}</div>
                {result.matchedMemberName ? (
                  <div className="mt-1">
                    확인된 수강생: {result.matchedMemberName}
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
