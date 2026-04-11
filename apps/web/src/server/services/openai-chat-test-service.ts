import { ServiceError } from "./service-error";

const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_CHAT_TEST_MODEL = "gpt-5.4-mini";
const OPENAI_CHAT_TEST_SUCCESS_TOKEN = "OPENAI_CHAT_TEST_OK";

type OpenAiErrorPayload = {
  error?: {
    message?: string;
  };
};

type OpenAiResponseContent = {
  type?: string;
  text?: string;
};

type OpenAiResponseOutputItem = {
  type?: string;
  content?: OpenAiResponseContent[];
};

type OpenAiResponsesPayload = {
  id?: string;
  model?: string;
  output_text?: string;
  output?: OpenAiResponseOutputItem[];
};

async function extractOpenAiErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as OpenAiErrorPayload;

    return data.error?.message?.trim() || null;
  } catch {
    return null;
  }
}

function extractOutputText(data: OpenAiResponsesPayload) {
  const directOutputText = data.output_text?.trim();

  if (directOutputText) {
    return directOutputText;
  }

  for (const item of data.output || []) {
    if (item.type !== "message") {
      continue;
    }

    for (const content of item.content || []) {
      if (content.type !== "output_text") {
        continue;
      }

      const text = content.text?.trim();

      if (text) {
        return text;
      }
    }
  }

  return null;
}

export async function runOpenAiChatIntegrationTest() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new ServiceError(
      500,
      "OPENAI_API_KEY 환경변수가 없어 챗GPT 연동 테스트를 시작할 수 없습니다.",
    );
  }

  const model =
    process.env.OPENAI_CHAT_TEST_MODEL?.trim() ||
    DEFAULT_OPENAI_CHAT_TEST_MODEL;
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: {
        effort: "low",
      },
      input: [
        {
          role: "developer",
          content:
            "이번 요청은 OpenAI API 연동 확인용이다. 반드시 OPENAI_CHAT_TEST_OK 만 정확히 출력하고 다른 문자는 추가하지 마라.",
        },
        {
          role: "user",
          content: "OpenAI API integration test",
        },
      ],
    }),
  });

  if (!response.ok) {
    const message =
      (await extractOpenAiErrorMessage(response)) ??
      "OpenAI API가 채팅 테스트 요청을 처리하지 못했습니다.";

    throw new ServiceError(
      response.status >= 500 ? 502 : response.status,
      message,
    );
  }

  const data = (await response.json()) as OpenAiResponsesPayload;
  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new ServiceError(
      502,
      "OpenAI API 응답에서 텍스트 결과를 찾지 못했습니다.",
    );
  }

  return {
    requestId: data.id?.trim() || null,
    model: data.model?.trim() || model,
    outputText,
    expectedToken: OPENAI_CHAT_TEST_SUCCESS_TOKEN,
    passed: outputText === OPENAI_CHAT_TEST_SUCCESS_TOKEN,
  };
}
