const EMAIL_STYLE_WRAPPER =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;";
const EMAIL_STYLE_BUTTON =
  "display: inline-block; padding: 12px 20px; background: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;";
const EMAIL_STYLE_MUTED = "color: #64748b; font-size: 13px; line-height: 1.6;";

export function buildEmailVerificationEmail(params: {
  token: string;
  appOrigin: string;
}) {
  const verifyUrl = new URL(
    `/api/auth/credentials/verify?token=${params.token}`,
    params.appOrigin,
  ).toString();

  const subject = "[yeon] 이메일 주소를 확인해 주세요";
  const html = `
    <div style="${EMAIL_STYLE_WRAPPER}">
      <h1 style="font-size: 20px; margin: 0 0 16px;">이메일 주소 확인</h1>
      <p style="font-size: 15px; line-height: 1.6;">
        yeon 계정 가입을 완료하려면 아래 버튼을 눌러 이메일 주소를 확인해 주세요.
      </p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="${EMAIL_STYLE_BUTTON}">이메일 인증하기</a>
      </p>
      <p style="${EMAIL_STYLE_MUTED}">
        버튼이 작동하지 않으면 아래 링크를 브라우저에 붙여넣어 주세요.<br />
        ${verifyUrl}
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="${EMAIL_STYLE_MUTED}">
        이 링크는 24시간 후 만료됩니다. 본인이 요청하지 않았다면 이 메일은 무시해 주세요.
      </p>
    </div>
  `;

  return { subject, html };
}

export function buildPasswordResetEmail(params: {
  token: string;
  appOrigin: string;
}) {
  const resetUrl = new URL(
    `/auth/reset-password?token=${params.token}`,
    params.appOrigin,
  ).toString();

  const subject = "[yeon] 비밀번호 재설정 안내";
  const html = `
    <div style="${EMAIL_STYLE_WRAPPER}">
      <h1 style="font-size: 20px; margin: 0 0 16px;">비밀번호 재설정</h1>
      <p style="font-size: 15px; line-height: 1.6;">
        비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.
      </p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="${EMAIL_STYLE_BUTTON}">비밀번호 재설정</a>
      </p>
      <p style="${EMAIL_STYLE_MUTED}">
        버튼이 작동하지 않으면 아래 링크를 브라우저에 붙여넣어 주세요.<br />
        ${resetUrl}
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="${EMAIL_STYLE_MUTED}">
        이 링크는 1시간 후 만료되며, 본인이 요청하지 않았다면 이 메일은 무시해도 안전합니다.
        비밀번호는 재설정 완료 전까지 변경되지 않습니다.
      </p>
    </div>
  `;

  return { subject, html };
}
