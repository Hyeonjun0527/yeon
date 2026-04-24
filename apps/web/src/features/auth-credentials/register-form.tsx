"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { credentialPasswordPolicy } from "@yeon/api-contract/credential";

import {
  credentialRegister,
  getCredentialErrorMessage,
} from "@/lib/credential-client";

import { ResendVerificationForm } from "./resend-verification-form";

type RegisterViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "link-needed" }
  | { kind: "email-send-failed"; email: string }
  | { kind: "sent"; email: string };

type RegisterFormProps = {
  nextPath?: string;
};

function deriveHelperMessage(password: string): string | null {
  if (password.length === 0) {
    return null;
  }
  if (password.length < credentialPasswordPolicy.minLength) {
    return `비밀번호가 너무 짧아요 (최소 ${credentialPasswordPolicy.minLength}자).`;
  }
  if (/\s/.test(password)) {
    return "비밀번호에 공백을 포함할 수 없습니다.";
  }
  if (password.length > credentialPasswordPolicy.maxLength) {
    return `비밀번호는 최대 ${credentialPasswordPolicy.maxLength}자까지 가능합니다.`;
  }
  return null;
}

export function RegisterForm({ nextPath = "/" }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<RegisterViewState>({ kind: "idle" });
  const registerMutation = useMutation({
    mutationFn: credentialRegister,
  });

  const isSubmitting =
    state.kind === "submitting" || registerMutation.isPending;
  const passwordHelper = deriveHelperMessage(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordHelper) {
      setState({ kind: "error", message: passwordHelper });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const response = await registerMutation.mutateAsync({
        email,
        password,
        displayName: displayName.trim() || null,
      });

      if (response.requiresLinkToExistingAccount) {
        setState({ kind: "link-needed" });
        return;
      }

      if (!response.verificationEmailSent) {
        setState({ kind: "email-send-failed", email });
        return;
      }

      setState({ kind: "sent", email });
    } catch (error) {
      const message = getCredentialErrorMessage(
        error,
        "가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setState({ kind: "error", message });
    }
  }

  if (state.kind === "link-needed") {
    const socialLoginHref = `/?login=1&next=${encodeURIComponent(nextPath)}`;
    return (
      <div className="grid gap-4 rounded-[20px] border border-white/[0.1] bg-[rgba(232,99,10,0.1)] p-5">
        <p className="m-0 text-[15px] font-bold leading-[1.5] text-[#ffcfa3]">
          이미 같은 이메일로 가입된 소셜 계정이 있어요.
        </p>
        <p className="m-0 text-[13px] leading-[1.6] text-white/[0.78]">
          기존 카카오/구글 계정으로 로그인하신 뒤 프로필 설정에서
          &quot;비밀번호 추가&quot;를 진행하면 같은 계정으로 일반 로그인도
          할 수 있어요.
        </p>
        <Link
          href={socialLoginHref}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#e8630a] px-5 text-[14px] font-bold text-[#fffaf4] transition-transform duration-200 ease-[ease] hover:-translate-y-px"
        >
          홈에서 소셜 로그인
        </Link>
      </div>
    );
  }

  if (state.kind === "sent") {
    return (
      <div className="grid gap-4">
        <div
          role="status"
          className="grid gap-2 rounded-[20px] border border-white/[0.1] bg-[rgba(16,17,20,0.6)] p-5 text-[13px] leading-[1.6] text-white/[0.82]"
        >
          <p className="m-0 text-[15px] font-bold text-white/90">
            인증 메일을 발송했습니다.
          </p>
          <p className="m-0">
            받은 편지함에서 링크를 눌러 이메일 인증을 완료해 주세요. 스팸함도
            함께 확인해 보시고, 메일이 도착하지 않으면 아래에서 다시 요청할 수
            있습니다.
          </p>
        </div>
        <ResendVerificationForm initialEmail={state.email} />
        <p className="m-0 text-[12px] text-white/55">
          인증 메일은 24시간 동안 유효합니다. 새로운 요청이 들어오면 이전 링크는
          더 이상 사용할 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-white/[0.82]">
          이메일
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

      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-white/[0.82]">
          표시 이름 <span className="text-white/50">(선택)</span>
        </span>
        <input
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
          className="h-12 rounded-[14px] border border-white/[0.12] bg-[rgba(255,255,255,0.04)] px-4 text-[15px] text-[#f8f7f3] outline-none transition-colors duration-150 placeholder:text-white/40 focus:border-[#e8630a]"
          placeholder="예: 김연재"
          disabled={isSubmitting}
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-white/[0.82]">
          비밀번호
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={credentialPasswordPolicy.minLength}
          maxLength={credentialPasswordPolicy.maxLength}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded-[14px] border border-white/[0.12] bg-[rgba(255,255,255,0.04)] px-4 text-[15px] text-[#f8f7f3] outline-none transition-colors duration-150 placeholder:text-white/40 focus:border-[#e8630a]"
          placeholder={`${credentialPasswordPolicy.minLength}자 이상, 공백 불가`}
          disabled={isSubmitting}
        />
        <span className="text-[12px] leading-[1.55] text-white/55">
          {passwordHelper ?? `최소 ${credentialPasswordPolicy.minLength}자 · 최대 ${credentialPasswordPolicy.maxLength}자 · 공백 불가`}
        </span>
      </label>

      {state.kind === "error" ? (
        <p
          role="alert"
          className="m-0 text-[13px] leading-[1.55] text-[#ffb38a]"
        >
          {state.message}
        </p>
      ) : null}

      {state.kind === "email-send-failed" ? (
        <div
          role="alert"
          className="grid gap-2 rounded-[16px] border border-white/[0.1] bg-[rgba(255,176,138,0.08)] p-4 text-[13px] leading-[1.55] text-[#ffcfa3]"
        >
          <p className="m-0 font-bold">
            계정은 만들어졌지만 인증 메일 발송에 실패했습니다.
          </p>
          <p className="m-0">
            잠시 후 아래 재발송 페이지에서 인증 메일을 다시 요청해 주세요.
          </p>
          <ResendVerificationForm initialEmail={state.email} />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || passwordHelper !== null}
        className="min-h-[52px] rounded-full bg-[#e8630a] px-[22px] text-[15px] font-bold text-[#fffaf4] transition-transform duration-200 ease-[ease] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "가입 처리 중..." : "계정 만들기"}
      </button>
    </form>
  );
}
