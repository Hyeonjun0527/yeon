import { ServiceError } from "@/server/services/service-error";

const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

type AligoSendResponse = {
  result_code?: number | string;
  message?: string;
  msg_id?: number | string;
  success_cnt?: number | string;
};

type AligoConfig = {
  apiKey: string;
  userId: string;
  sender: string;
  testMode: boolean;
};

function parseBooleanEnv(value: string | undefined) {
  return value === "true";
}

function readAligoConfig(): AligoConfig | null {
  const apiKey = process.env.ALIGO_API_KEY?.trim();
  const userId = process.env.ALIGO_USER_ID?.trim();
  const sender = process.env.ALIGO_SENDER?.trim();

  if (!apiKey || !userId || !sender) {
    return null;
  }

  return {
    apiKey,
    userId,
    sender,
    testMode: parseBooleanEnv(process.env.ALIGO_TEST_MODE),
  };
}

function buildOtpMessage(otpCode: string) {
  return `[YEON] 인증번호는 ${otpCode} 입니다.`;
}

export async function sendChatServiceOtpSms(params: {
  otpCode: string;
  phoneNumber: string;
}) {
  const config = readAligoConfig();

  if (!config) {
    throw new ServiceError(
      503,
      "문자 인증 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.",
    );
  }

  const body = new URLSearchParams({
    key: config.apiKey,
    user_id: config.userId,
    sender: config.sender,
    receiver: params.phoneNumber,
    msg: buildOtpMessage(params.otpCode),
    testmode_yn: config.testMode ? "Y" : "N",
  });

  const response = await fetch(ALIGO_SEND_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new ServiceError(
      502,
      "문자 인증 요청이 외부 서비스에서 실패했습니다.",
    );
  }

  let payload: AligoSendResponse;

  try {
    payload = (await response.json()) as AligoSendResponse;
  } catch {
    throw new ServiceError(502, "문자 인증 응답을 해석하지 못했습니다.");
  }

  const resultCode = Number(payload.result_code);
  const successCount = Number(payload.success_cnt ?? 0);
  const hasSuccessCount = payload.success_cnt !== undefined;

  if (
    !Number.isFinite(resultCode) ||
    resultCode < 0 ||
    (hasSuccessCount && successCount < 1)
  ) {
    throw new ServiceError(
      502,
      payload.message?.trim() ||
        "문자 인증 요청이 외부 서비스에서 거절되었습니다.",
    );
  }

  return {
    messageId: payload.msg_id ? String(payload.msg_id) : null,
    testMode: config.testMode,
  };
}
