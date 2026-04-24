"use client";

import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import {
  credentialRequestReset,
  getCredentialErrorMessage,
} from "@/lib/credential-client";

type ResetRequestViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "sent" };

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ResetRequestViewState>({ kind: "idle" });
  const requestResetMutation = useMutation({
    mutationFn: credentialRequestReset,
  });

  const isSubmitting =
    state.kind === "submitting" || requestResetMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });

    try {
      await requestResetMutation.mutateAsync({ email });
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
          재설정 메일을 보냈습니다.
        </p>
        <p className="m-0">
          입력한 이메일이 가입된 계정이라면 1시간 내 유효한 재설정 링크가
          포함된 메일이 도착합니다. 받은 편지함과 스팸함을 함께 확인해 주세요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
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
        className="min-h-[52px] rounded-full bg-[#e8630a] px-[22px] text-[15px] font-bold text-[#fffaf4] transition-transform duration-200 ease-[ease] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "요청 중..." : "재설정 링크 받기"}
      </button>
    </form>
  );
}
