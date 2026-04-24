"use client";

import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import {
  credentialResendVerification,
  getCredentialErrorMessage,
} from "@/lib/credential-client";

type ResendViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "sent" };

type ResendVerificationFormProps = {
  initialEmail?: string;
};

export function ResendVerificationForm({
  initialEmail = "",
}: ResendVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<ResendViewState>({ kind: "idle" });
  const resendMutation = useMutation({
    mutationFn: credentialResendVerification,
  });

  const isSubmitting = state.kind === "submitting" || resendMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });

    try {
      await resendMutation.mutateAsync({ email });
      setState({ kind: "sent" });
    } catch (error) {
      const message = getCredentialErrorMessage(
        error,
        "요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setState({ kind: "error", message });
    }
  }

  if (state.kind === "sent") {
    return (
      <div
        role="status"
        className="grid gap-2 rounded-[18px] border border-white/[0.1] bg-[rgba(16,17,20,0.6)] p-4 text-[13px] leading-[1.6] text-white/[0.78]"
      >
        <p className="m-0 font-bold text-white/85">
          인증 메일을 다시 보냈습니다.
        </p>
        <p className="m-0">
          받은 편지함을 확인해 주세요. 스팸함도 함께 살펴보시면 좋아요.
          메일이 도착하지 않으면 잠시 후 한 번 더 요청할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-white/[0.82]">
          가입에 사용한 이메일
        </span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-[14px] border border-white/[0.12] bg-[rgba(255,255,255,0.04)] px-4 text-[15px] text-[#f8f7f3] outline-none transition-colors duration-150 placeholder:text-white/40 focus:border-[#e8630a]"
          placeholder="you@yeon.world"
          disabled={isSubmitting}
        />
      </label>

      {state.kind === "error" ? (
        <p
          role="alert"
          className="m-0 text-[13px] leading-[1.55] text-[#ffb38a]"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[48px] rounded-full border border-white/[0.14] bg-white/[0.04] px-5 text-[14px] font-bold text-white/90 transition-[transform,background-color] duration-200 ease-[ease] hover:enabled:-translate-y-px hover:enabled:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "재발송 중..." : "인증 메일 다시 받기"}
      </button>
    </form>
  );
}
