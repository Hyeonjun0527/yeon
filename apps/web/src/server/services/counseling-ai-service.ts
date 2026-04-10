import { ServiceError } from "./service-error";

const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";
const DEFAULT_AI_CHAT_MODEL = "gpt-4.1-mini";

type TranscriptSegmentInput = {
  speakerLabel: string;
  text: string;
  startMs: number;
};

type RecordMetaInput = {
  studentName: string;
  sessionTitle: string;
  counselingType: string;
  createdAt: string;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function formatTimestamp(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildTranscriptBlock(segments: TranscriptSegmentInput[]) {
  return segments
    .map(
      (segment) =>
        `[${formatTimestamp(segment.startMs)}] ${segment.speakerLabel}: ${segment.text}`,
    )
    .join("\n");
}

function buildSystemPrompt(
  meta: RecordMetaInput,
  segments: TranscriptSegmentInput[],
) {
  const transcriptBlock = buildTranscriptBlock(segments);

  return `당신은 교육 상담 기록 분석 전문 AI 도우미입니다.

## 역할
- 교사가 업로드한 상담 녹음의 전사 원문을 바탕으로 분석, 요약, 후속 조치 제안을 합니다.
- 항상 원문에 근거해 답변하고, 원문에 없는 내용을 지어내지 않습니다.
- 실무에 바로 쓸 수 있는 구체적이고 실용적인 답변을 합니다.

## 현재 상담 기록 정보
- 학생: ${meta.studentName}
- 상담 제목: ${meta.sessionTitle}
- 상담 유형: ${meta.counselingType}
- 기록 일시: ${meta.createdAt}

## 상담 원문 전사
${transcriptBlock}

## 응답 가이드라인
- 한국어로 답변합니다.
- 마크다운 서식을 자유롭게 사용합니다 (볼드, 리스트, 헤딩 등).
- 핵심을 먼저 말하고, 근거를 원문 인용으로 뒷받침합니다.
- 원문 인용 시 타임스탬프를 함께 표기합니다.
- 불필요하게 길게 쓰지 말고, 교사가 바로 활용할 수 있는 수준으로 정리합니다.`;
}

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new ServiceError(
      500,
      "OPENAI_API_KEY 환경변수가 설정되지 않아 AI 도우미를 사용할 수 없습니다.",
    );
  }

  return apiKey;
}

export function buildInitialAnalysisPrompt() {
  return "이 상담 내용을 분석해주세요. 다음을 포함해 주세요:\n1. **핵심 요약** (3-4문장)\n2. **주요 포인트** (3-5개)\n3. **학생 상태 관찰** (감정, 태도 변화)\n4. **후속 조치 제안** (다음 상담 방향, 보호자 공유 포인트)";
}

export async function streamCounselingAiChat(
  meta: RecordMetaInput,
  segments: TranscriptSegmentInput[],
  conversationMessages: { role: "user" | "assistant"; content: string }[],
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getOpenAiApiKey();
  const model =
    process.env.OPENAI_AI_CHAT_MODEL?.trim() || DEFAULT_AI_CHAT_MODEL;

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(meta, segments) },
    ...conversationMessages,
  ];

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    let errorMessage = "AI 도우미가 응답하지 못했습니다.";

    try {
      const errorData = (await response.json()) as {
        error?: { message?: string };
      };

      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // 에러 파싱 실패 시 기본 메시지 사용
    }

    throw new ServiceError(
      response.status >= 500 ? 502 : response.status,
      errorMessage,
    );
  }

  if (!response.body) {
    throw new ServiceError(502, "AI 응답 스트림을 받지 못했습니다.");
  }

  return transformOpenAiStream(response.body);
}

// 78차: 추이 분석 시스템 프롬프트
function buildTrendAnalysisSystemPrompt(
  studentName: string,
  recordSummaries: {
    sessionTitle: string;
    counselingType: string;
    createdAt: string;
    transcriptBlock: string;
  }[],
) {
  const recordBlocks = recordSummaries
    .map(
      (r, i) =>
        `### ${i + 1}차 상담 (${r.createdAt})\n- 제목: ${r.sessionTitle}\n- 유형: ${r.counselingType}\n\n${r.transcriptBlock}`,
    )
    .join("\n\n---\n\n");

  return `당신은 교육 상담 기록 분석 전문 AI 도우미입니다.

## 역할
아래는 "${studentName}" 학생의 여러 차례 상담 원문입니다. 시간 순서로 학생의 변화 추이, 반복되는 이슈, 개선된 점, 주의 필요 사항을 분석해주세요.

## 상담 기록들
${recordBlocks}

## 응답 가이드라인
- 한국어로 답변합니다.
- 마크다운 서식을 자유롭게 사용합니다.
- 다음 구조로 분석합니다:
  1. **전체 추이 요약** — 학생의 변화 흐름을 3-5문장으로 정리
  2. **반복되는 이슈** — 여러 상담에 걸쳐 반복 등장하는 문제
  3. **긍정적 변화** — 개선되거나 해소된 부분
  4. **주의 필요 사항** — 악화 경향이나 새로 발견된 위험 신호
  5. **후속 조치 제안** — 다음 상담 방향, 보호자 공유 포인트
- 원문 인용 시 몇 차 상담인지 표기합니다.
- 불필요하게 길게 쓰지 않습니다.`;
}

export async function streamTrendAnalysis(
  studentName: string,
  recordSummaries: {
    sessionTitle: string;
    counselingType: string;
    createdAt: string;
    segments: TranscriptSegmentInput[];
  }[],
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getOpenAiApiKey();
  const model =
    process.env.OPENAI_AI_CHAT_MODEL?.trim() || DEFAULT_AI_CHAT_MODEL;

  const systemPrompt = buildTrendAnalysisSystemPrompt(
    studentName,
    recordSummaries.map((r) => ({
      sessionTitle: r.sessionTitle,
      counselingType: r.counselingType,
      createdAt: r.createdAt,
      transcriptBlock: buildTranscriptBlock(r.segments),
    })),
  );

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: "위 상담 기록들을 바탕으로 학생의 변화 추이를 분석해주세요.",
    },
  ];

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    let errorMessage = "추이 분석 AI가 응답하지 못했습니다.";

    try {
      const errorData = (await response.json()) as {
        error?: { message?: string };
      };

      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // 에러 파싱 실패
    }

    throw new ServiceError(
      response.status >= 500 ? 502 : response.status,
      errorMessage,
    );
  }

  if (!response.body) {
    throw new ServiceError(502, "AI 응답 스트림을 받지 못했습니다.");
  }

  return transformOpenAiStream(response.body);
}

function transformOpenAiStream(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed || !trimmed.startsWith("data: ")) {
              continue;
            }

            const payload = trimmed.slice(6);

            if (payload === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
                );
              }
            } catch {
              // 파싱 불가능한 줄은 무시
            }
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
