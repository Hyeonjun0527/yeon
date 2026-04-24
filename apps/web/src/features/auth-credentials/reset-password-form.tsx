"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { credentialPasswordPolicy } from "@yeon/api-contract/credential";

import {
  credentialConfirmReset,
  getCredentialErrorMessage,
} from "@/lib/credential-client";

type ResetPasswordViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

type ResetPasswordFormProps = {
  token: string;
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

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<ResetPasswordViewState>({ kind: "idle" });
  const confirmResetMutation = useMutation({
    mutationFn: credentialConfirmReset,
  });

  const isSubmitting =
    state.kind === "submitting" || confirmResetMutation.isPending;
  const passwordHelper = deriveHelperMessage(password);
  const mismatched = confirmPassword.length > 0 && confirmPassword !== password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordHelper) {
      setState({ kind: "error", message: passwordHelper });
      return;
    }
    if (mismatched) {
      setState({
        kind: "error",
        message: "확인용 비밀번호가 일치하지 않습니다.",
      });
      return;
    }

    setState({ kind: "submitting" });

    try {
      await confirmResetMutation.mutateAsync({ token, newPassword: password });
      router.push("/auth/login?resetOk=1");
    } catch (error) {
      const message = getCredentialErrorMessage(
        error,
        "비밀번호 재설정에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setState({ kind: "error", message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-white/[0.82]">
          새 비밀번호
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

      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-white/[0.82]">
          새 비밀번호 확인
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="h-12 rounded-[14px] border border-white/[0.12] bg-[rgba(255,255,255,0.04)] px-4 text-[15px] text-[#f8f7f3] outline-none transition-colors duration-150 placeholder:text-white/40 focus:border-[#e8630a]"
          placeholder="비밀번호를 한 번 더 입력해 주세요."
          disabled={isSubmitting}
        />
        {mismatched ? (
          <span className="text-[12px] leading-[1.55] text-[#ffb38a]">
            두 비밀번호가 일치하지 않아요.
          </span>
        ) : null}
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
        disabled={isSubmitting || passwordHelper !== null || mismatched}
        className="min-h-[52px] rounded-full bg-[#e8630a] px-[22px] text-[15px] font-bold text-[#fffaf4] transition-transform duration-200 ease-[ease] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "재설정 중..." : "비밀번호 재설정"}
      </button>
    </form>
  );
}
