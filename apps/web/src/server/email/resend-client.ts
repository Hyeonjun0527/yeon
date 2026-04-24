import { Resend } from "resend";

let cachedClient: Resend | null = null;

export function getResendClient(): Resend {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "이메일 발송 설정이 완료되지 않았습니다. RESEND_API_KEY 환경변수를 확인해 주세요.",
    );
  }

  cachedClient = new Resend(apiKey);

  return cachedClient;
}

export function getEmailFromAddress(): string {
  const raw = process.env.RESEND_FROM_ADDRESS?.trim();
  return raw && raw.length > 0 ? raw : "noreply@yeon.world";
}
