import { getEmailFromAddress, getResendClient } from "./resend-client";

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const client = getResendClient();
  const from = getEmailFromAddress();

  const result = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (result.error) {
    console.error("이메일 발송 실패", {
      to: params.to,
      subject: params.subject,
      error: result.error,
    });
    throw new EmailDeliveryError("이메일 발송에 실패했습니다.");
  }

  return {
    providerMessageId: result.data?.id ?? null,
  };
}
