import type {
  CredentialLoginBody,
  CredentialLoginResponse,
  CredentialRegisterBody,
  CredentialRegisterResponse,
  CredentialResendVerificationBody,
  CredentialResetConfirmBody,
  CredentialResetRequestBody,
  CredentialSetPasswordBody,
} from "@yeon/api-contract/credential";

export class CredentialApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CredentialApiError";
  }
}

export function getCredentialErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return error instanceof CredentialApiError ? error.message : fallbackMessage;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    // noop
  }
  return "요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

async function postJson<TReq, TRes>(
  path: string,
  body: TReq,
): Promise<TRes> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new CredentialApiError(
      response.status,
      await extractErrorMessage(response),
    );
  }

  return (await response.json()) as TRes;
}

async function postNoContent<TReq>(path: string, body: TReq): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new CredentialApiError(
      response.status,
      await extractErrorMessage(response),
    );
  }
}

export function credentialRegister(body: CredentialRegisterBody) {
  return postJson<CredentialRegisterBody, CredentialRegisterResponse>(
    "/api/auth/credentials/register",
    body,
  );
}

export function credentialLogin(body: CredentialLoginBody) {
  return postJson<CredentialLoginBody, CredentialLoginResponse>(
    "/api/auth/credentials/login",
    body,
  );
}

export function credentialRequestReset(body: CredentialResetRequestBody) {
  return postNoContent<CredentialResetRequestBody>(
    "/api/auth/credentials/reset-request",
    body,
  );
}

export function credentialConfirmReset(body: CredentialResetConfirmBody) {
  return postNoContent<CredentialResetConfirmBody>(
    "/api/auth/credentials/reset-confirm",
    body,
  );
}

export function credentialResendVerification(
  body: CredentialResendVerificationBody,
) {
  return postNoContent<CredentialResendVerificationBody>(
    "/api/auth/credentials/resend-verification",
    body,
  );
}

export function credentialSetPassword(body: CredentialSetPasswordBody) {
  return postNoContent<CredentialSetPasswordBody>(
    "/api/auth/credentials/set-password",
    body,
  );
}
