import { type AnalysisResult, analysisResultSchema } from "@yeon/api-contract";
import { ServiceError } from "./service-error";

const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";
const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_AI_CHAT_MODEL = "gpt-4.1-mini";
const DEFAULT_WEB_SEARCH_MODEL = "gpt-5.4-mini";
const MAX_DIRECT_ANALYSIS_CHARS = 14_000;
const MAX_SECTION_ANALYSIS_CHARS = 9_000;
const WEB_SEARCH_REQUEST_TIMEOUT_MS = 18_000;

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

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenAiErrorPayload = {
  error?: {
    message?: string;
  };
};

type OpenAiResponseAnnotation = {
  type?: string;
  url?: string;
  title?: string;
};

type OpenAiResponseContent = {
  type?: string;
  text?: string;
  annotations?: OpenAiResponseAnnotation[];
};

type OpenAiResponseOutputItem = {
  type?: string;
  content?: OpenAiResponseContent[];
};

type OpenAiResponseSource = {
  url?: string;
  title?: string;
};

type OpenAiResponsesPayload = {
  id?: string;
  model?: string;
  output_text?: string;
  output?: OpenAiResponseOutputItem[];
  sources?: OpenAiResponseSource[];
};

type UrlCitation = {
  url: string;
  title: string;
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

function splitTranscriptSegmentsForAnalysis(
  segments: TranscriptSegmentInput[],
  maxChars: number,
) {
  const groups: TranscriptSegmentInput[][] = [];
  let currentGroup: TranscriptSegmentInput[] = [];
  let currentLength = 0;

  for (const segment of segments) {
    const segmentLength = segment.text.length + 24;

    if (currentGroup.length > 0 && currentLength + segmentLength > maxChars) {
      groups.push(currentGroup);
      currentGroup = [];
      currentLength = 0;
    }

    currentGroup.push(segment);
    currentLength += segmentLength;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/** 화자 분리 여부 — generic 라벨(원문/unknown)만 있으면 미분리로 판단 */
function hasDiarization(segments: TranscriptSegmentInput[]): boolean {
  return segments.some(
    (s) => s.speakerLabel !== "원문" && s.speakerLabel !== "unknown",
  );
}

function buildChatSystemPrompt(
  meta: RecordMetaInput,
  segments: TranscriptSegmentInput[],
) {
  const transcriptBlock = buildTranscriptBlock(segments);

  const diarizationGuide = hasDiarization(segments)
    ? ""
    : `
## 화자 분리 안내
이 녹음은 화자 분리가 수행되지 않아 전체가 하나의 원문으로 제공됩니다.
대화 맥락(질문↔응답, 존댓말↔반말, 호칭 등)을 바탕으로 멘토와 수강생의 발화를 추론하여 분석에 반영하세요.`;

  return `당신은 부트캠프/교육 프로그램 상담 기록 분석 전문 AI 도우미입니다.

## 역할
- 멘토/운영자가 업로드한 상담 녹음의 전사 원문을 바탕으로 분석, 요약, 후속 조치 제안을 합니다.
- 항상 원문에 근거해 답변하고, 원문에 없는 내용을 지어내지 않습니다.
- 실무에 바로 쓸 수 있는 구체적이고 실용적인 답변을 합니다.
- 대상은 20~30대 성인 수강생입니다. 학교/초중고 맥락이 아닙니다.

## 현재 상담 기록 정보
- 수강생: ${meta.studentName || "(미지정)"}
- 상담 제목: ${meta.sessionTitle}
- 상담 유형: ${meta.counselingType}
- 기록 일시: ${meta.createdAt}
${diarizationGuide}

## 상담 원문 전사
${transcriptBlock}

## 응답 가이드라인
- 한국어로 답변합니다.
- 첫 문단은 쉬운 표현으로 짧고 간단하게 요약합니다.
- 사용자가 더 자세한 설명을 원할 때만, 다음 문단에서 근거 인용과 실행 제안을 덧붙입니다.
- 마크다운 서식을 자유롭게 사용합니다 (볼드, 리스트, 헤딩 등).
- 핵심을 먼저 말하고, 근거를 원문 인용으로 뒷받침합니다.
- 원문 인용 시 타임스탬프를 함께 표기합니다.
- 불필요하게 길게 쓰지 말고, 멘토가 바로 활용할 수 있는 수준으로 정리합니다.`;
}

/** 전사 후 화자 라벨을 실제 이름/역할로 매핑 */
export type SpeakerMapping = Record<
  string,
  { name: string; tone: "teacher" | "student" | "unknown" }
>;

export async function resolveSpeakerNames(
  segments: TranscriptSegmentInput[],
): Promise<{ mapping: SpeakerMapping; studentName: string | null }> {
  const apiKey = getOpenAiApiKey();
  const model =
    process.env.OPENAI_AI_CHAT_MODEL?.trim() || DEFAULT_AI_CHAT_MODEL;

  const uniqueLabels = [...new Set(segments.map((s) => s.speakerLabel))];

  // 이미 의미 있는 이름이면 스킵
  const isGeneric = uniqueLabels.every(
    (l) =>
      l === "원문" ||
      /^화자\s/.test(l) ||
      /^[A-Z]$/.test(l) ||
      /^speaker/i.test(l),
  );
  if (!isGeneric) {
    return { mapping: {}, studentName: null };
  }

  const transcriptPreview = segments
    .slice(0, 30)
    .map((s) => `[${s.speakerLabel}] ${s.text}`)
    .join("\n");

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `당신은 상담 녹음 전사문에서 화자를 식별하는 전문가입니다.
아래 전사문을 분석하여 각 화자 라벨이 누구인지 추론하세요.

규칙:
- 대화 맥락(호칭, 질문↔응답, 존댓말↔반말)을 활용합니다.
- 이름이 언급되면 반드시 반영합니다 (예: "민수야" → 상대방이 민수).
- 질문하고 주도하는 쪽은 "멘토", 답변하는 쪽은 수강생입니다.
- 멘토의 tone은 "teacher", 수강생의 tone은 "student"입니다.

JSON 형식으로 반환:
{
  "mapping": {
    "화자 A": { "name": "실제이름 또는 역할", "tone": "teacher|student|unknown" },
    "화자 B": { "name": "실제이름 또는 역할", "tone": "teacher|student|unknown" }
  },
  "studentName": "수강생 이름 (확인 불가 시 null)"
}`,
        },
        { role: "user", content: transcriptPreview },
      ],
    }),
  });

  if (!response.ok) {
    console.warn("화자 식별 AI 호출 실패:", response.status);
    return { mapping: {}, studentName: null };
  }

  try {
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { mapping: {}, studentName: null };

    const parsed = JSON.parse(content) as {
      mapping?: SpeakerMapping;
      studentName?: string | null;
    };
    return {
      mapping: parsed.mapping ?? {},
      studentName: parsed.studentName ?? null,
    };
  } catch {
    console.warn("화자 식별 응답 파싱 실패");
    return { mapping: {}, studentName: null };
  }
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

async function extractOpenAiErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as OpenAiErrorPayload;

    return data.error?.message?.trim() || null;
  } catch {
    return null;
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function buildGeneralAiSystemPrompt() {
  return `당신은 한국어로 답하는 일반 AI 도우미입니다.

## 역할
- 사용자의 질문에 직접적이고 실용적으로 답합니다.
- 웹 검색 없이도 답변 가능한 범위에서는 명확하게 설명합니다.
- 최신 정보, 실시간 정보, 수치, 일정처럼 시점 민감한 내용은 확실하지 않으면 단정하지 않습니다.

## 응답 규칙
- 한국어로 답변합니다.
- 핵심부터 짧고 분명하게 설명합니다.
- 필요할 때만 리스트나 마크다운을 사용합니다.
- 모르는 내용은 아는 척하지 말고 한계를 분명히 밝힙니다.`;
}

function buildWebSearchSystemPrompt() {
  return `당신은 한국어로 답하는 웹 검색형 AI 도우미입니다.

## 역할
- 이번 모드에서는 반드시 웹 검색 도구를 사용한 뒤 답변합니다.
- 사용자의 질문이 최신 정보와 직접 관련 없어 보여도 최소 1회는 웹 검색을 수행합니다.
- 검색 결과를 바탕으로 답하되, 확실하지 않은 내용은 불확실성을 분명히 밝힙니다.

## 응답 규칙
- 한국어로 답변합니다.
- 핵심부터 짧고 분명하게 설명합니다.
- 불필요한 군더더기 없이 실용적으로 답합니다.
- 답변 본문과 별도의 출처 목록은 서버가 후처리하므로, 본문은 자연스럽게 작성합니다.`;
}

function dedupeUrlCitations(citations: UrlCitation[]) {
  const unique = new Map<string, UrlCitation>();

  for (const citation of citations) {
    const url = citation.url.trim();

    if (!url || unique.has(url)) {
      continue;
    }

    unique.set(url, {
      url,
      title: citation.title.trim() || url,
    });
  }

  return [...unique.values()];
}

function extractWebSearchResult(data: OpenAiResponsesPayload) {
  const outputTexts: string[] = [];
  const citations: UrlCitation[] = [];
  let hasWebSearchCall = false;

  for (const item of data.output || []) {
    if (item.type === "web_search_call") {
      hasWebSearchCall = true;
      continue;
    }

    if (item.type !== "message") {
      continue;
    }

    for (const content of item.content || []) {
      if (content.type !== "output_text") {
        continue;
      }

      const text = content.text?.trim();
      if (text) {
        outputTexts.push(text);
      }

      for (const annotation of content.annotations || []) {
        if (annotation.type !== "url_citation" || !annotation.url?.trim()) {
          continue;
        }

        citations.push({
          url: annotation.url,
          title: annotation.title?.trim() || annotation.url,
        });
      }
    }
  }

  for (const source of data.sources || []) {
    if (!source.url?.trim()) {
      continue;
    }

    citations.push({
      url: source.url,
      title: source.title?.trim() || source.url,
    });
  }

  return {
    text: (data.output_text?.trim() || outputTexts.join("\n\n").trim()) ?? "",
    citations: dedupeUrlCitations(citations),
    hasWebSearchCall,
  };
}

function formatCitationsMarkdown(citations: UrlCitation[]) {
  if (citations.length === 0) {
    return "";
  }

  const lines = citations.map(
    (citation) => `- [${citation.title}](${citation.url})`,
  );

  return `\n\n---\n\n**출처**\n${lines.join("\n")}`;
}

function createTextEventStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

async function requestResponsesApi(params: {
  apiKey: string;
  model: string;
  input: Array<{
    role: "developer" | "user" | "assistant";
    content: string;
  }>;
  tools: Array<Record<string, unknown>>;
  toolChoice?: "auto" | "required";
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    params.timeoutMs ?? WEB_SEARCH_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        store: false,
        input: params.input,
        tools: params.tools,
        tool_choice: params.toolChoice ?? "auto",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorMessage =
        (await extractOpenAiErrorMessage(response)) ??
        "OpenAI Responses API가 요청을 처리하지 못했습니다.";

      throw new ServiceError(
        response.status >= 500 ? 502 : response.status,
        errorMessage,
      );
    }

    return (await response.json()) as OpenAiResponsesPayload;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestChatCompletion(params: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  responseFormat?: { type: "json_object" };
  temperature?: number;
}) {
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      ...(params.responseFormat
        ? {
            response_format: params.responseFormat,
          }
        : {}),
      temperature: params.temperature ?? 0.2,
    }),
  });

  if (!response.ok) {
    let errorMessage = "AI 분석에 실패했습니다.";
    try {
      const errorData = (await response.json()) as {
        error?: { message?: string };
      };
      if (errorData.error?.message) errorMessage = errorData.error.message;
    } catch {
      // noop
    }
    throw new ServiceError(
      response.status >= 500 ? 502 : response.status,
      errorMessage,
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;

  if (!raw) {
    throw new ServiceError(502, "AI 분석 응답이 비어 있습니다.");
  }

  return raw;
}

async function summarizeTranscriptSection(params: {
  apiKey: string;
  model: string;
  meta: RecordMetaInput;
  segments: TranscriptSegmentInput[];
  sectionIndex: number;
  sectionCount: number;
}) {
  const transcriptBlock = buildTranscriptBlock(params.segments);

  return requestChatCompletion({
    apiKey: params.apiKey,
    model: params.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `당신은 상담 원문을 section 단위로 먼저 정리하는 보조 분석기입니다.
- 한국어로 작성합니다.
- 이 section에서 확인된 사실만 정리합니다.
- 추측은 최소화합니다.
- 아래 형식으로 요약합니다.

## 핵심 요약
- ...

## 주요 이슈
- [mm:ss] ...

## 후속 액션 후보
- ...`,
      },
      {
        role: "user",
        content: `상담 제목: ${params.meta.sessionTitle}
수강생: ${params.meta.studentName || "(미지정)"}
상담 유형: ${params.meta.counselingType}
구간: ${params.sectionIndex + 1}/${params.sectionCount}

${transcriptBlock}`,
      },
    ],
  });
}

/** 상담 기록을 JSON 구조로 분석하여 반환 (비스트리밍) */
export async function analyzeCounselingRecord(
  meta: RecordMetaInput,
  segments: TranscriptSegmentInput[],
  onProgress?: (progress: number) => Promise<void> | void,
): Promise<AnalysisResult> {
  const apiKey = getOpenAiApiKey();
  const model =
    process.env.OPENAI_AI_CHAT_MODEL?.trim() || DEFAULT_AI_CHAT_MODEL;

  const transcriptBlock = buildTranscriptBlock(segments);

  const diarizationGuide = hasDiarization(segments)
    ? ""
    : `\n화자 분리가 수행되지 않아 전체가 하나의 원문으로 제공됩니다. 대화 맥락을 바탕으로 멘토와 수강생의 발화를 추론하세요.`;

  const systemPrompt = `당신은 부트캠프/교육 프로그램 상담 기록 분석 전문 AI입니다.

## 역할
멘토/운영자가 업로드한 상담 녹음의 전사 원문을 분석하여 구조화된 JSON으로 반환합니다.
항상 원문에 근거하고, 원문에 없는 내용을 지어내지 않습니다.
대상은 20~30대 성인 수강생입니다.
${diarizationGuide}

## 현재 상담 기록
- 수강생: ${meta.studentName || "(미지정)"}
- 상담 제목: ${meta.sessionTitle}
- 상담 유형: ${meta.counselingType}
- 기록 일시: ${meta.createdAt}

## 상담 원문 전사
${transcriptBlock}

## 응답 규칙
- 한국어로 작성합니다.
- 원문 인용 시 타임스탬프를 포함합니다 (예: "[01:23]").
- 반드시 아래 JSON 스키마를 따릅니다:

{
  "summary": "3-4문장의 핵심 요약",
  "member": {
    "name": "원문에서 파악된 수강생 이름 (없으면 null)",
    "traits": ["성격", "학습 스타일", "현재 상황 등 관찰 특징"],
    "emotion": "상담 중 드러난 감정/태도 변화 요약"
  },
  "issues": [
    {
      "title": "이슈 제목",
      "detail": "상세 설명 (원문 인용 포함)",
      "timestamp": "관련 타임스탬프 (없으면 null)"
    }
  ],
  "actions": {
    "mentor": ["멘토가 취해야 할 구체적 행동"],
    "member": ["수강생에게 권하는 다음 단계"],
    "nextSession": ["후속 상담에서 확인할 사항"]
  },
  "keywords": ["상담 핵심 키워드 3-5개"],
  "riskAssessment": {
    "level": "low | medium | high",
    "basis": "왜 이 위험도로 판단했는지 원문 근거 기반 1-2문장 요약",
    "signals": ["반복 결석", "과제 지연", "자신감 저하" 같은 핵심 위험 신호 1-3개]
  }
}

## 위험도 분류 기준
- low: 현재 큰 이탈 위험은 낮고 관찰 중심으로 충분합니다.
- medium: 반복 확인이 필요한 경고 신호가 있으며 후속 상담/추적이 필요합니다.
- high: 이탈, 중도 포기, 심한 정서 저하, 지속적 수행 붕괴처럼 즉시 개입이 필요한 상태입니다.
- riskAssessment는 반드시 포함합니다.
- basis와 signals는 반드시 상담 원문에 근거해야 합니다.
}`;

  await onProgress?.(10);

  const raw =
    transcriptBlock.length <= MAX_DIRECT_ANALYSIS_CHARS
      ? await requestChatCompletion({
          apiKey,
          model,
          responseFormat: { type: "json_object" },
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: "위 상담 기록을 분석하여 JSON으로 반환하세요.",
            },
          ],
        })
      : await (async () => {
          const sections = splitTranscriptSegmentsForAnalysis(
            segments,
            MAX_SECTION_ANALYSIS_CHARS,
          );
          const sectionSummaries: string[] = [];

          for (const [index, section] of sections.entries()) {
            const summary = await summarizeTranscriptSection({
              apiKey,
              model,
              meta,
              segments: section,
              sectionIndex: index,
              sectionCount: sections.length,
            });
            sectionSummaries.push(`### 구간 ${index + 1}\n${summary}`);
            const progress = Math.min(
              80,
              15 + Math.round(((index + 1) / sections.length) * 55),
            );
            await onProgress?.(progress);
          }

          return requestChatCompletion({
            apiKey,
            model,
            responseFormat: { type: "json_object" },
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content: `${systemPrompt}

아래는 긴 상담 원문을 여러 구간으로 나눠 미리 요약한 결과입니다.
이 section 요약들을 종합해 최종 JSON만 반환하세요.`,
              },
              {
                role: "user",
                content: sectionSummaries.join("\n\n"),
              },
            ],
          });
        })();

  await onProgress?.(95);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ServiceError(502, "AI 분석 응답 JSON 파싱 실패");
  }

  const validated = analysisResultSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn("AI 분석 응답 스키마 검증 실패:", validated.error.message);
    throw new ServiceError(502, "AI 분석 응답이 예상 스키마와 다릅니다.");
  }

  await onProgress?.(100);

  return validated.data;
}

export async function streamCounselingAiChat(
  meta: RecordMetaInput,
  segments: TranscriptSegmentInput[],
  conversationMessages: ConversationMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getOpenAiApiKey();
  const model =
    process.env.OPENAI_AI_CHAT_MODEL?.trim() || DEFAULT_AI_CHAT_MODEL;

  const messages: ChatMessage[] = [
    { role: "system", content: buildChatSystemPrompt(meta, segments) },
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

async function streamGeneralAiChat(
  conversationMessages: ConversationMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getOpenAiApiKey();
  const model =
    process.env.OPENAI_AI_CHAT_MODEL?.trim() || DEFAULT_AI_CHAT_MODEL;

  const messages: ChatMessage[] = [
    { role: "system", content: buildGeneralAiSystemPrompt() },
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
    let errorMessage = "일반 AI 도우미가 응답하지 못했습니다.";

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
    throw new ServiceError(502, "일반 AI 응답 스트림을 받지 못했습니다.");
  }

  return transformOpenAiStream(response.body);
}

export async function streamWebSearchAiChat(
  conversationMessages: ConversationMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getOpenAiApiKey();
  const model =
    process.env.OPENAI_WEB_SEARCH_MODEL?.trim() || DEFAULT_WEB_SEARCH_MODEL;

  try {
    const response = await requestResponsesApi({
      apiKey,
      model,
      toolChoice: "required",
      tools: [
        {
          type: "web_search",
          external_web_access: true,
        },
      ],
      input: [
        {
          role: "developer",
          content: buildWebSearchSystemPrompt(),
        },
        ...conversationMessages,
      ],
    });

    const { text, citations, hasWebSearchCall } =
      extractWebSearchResult(response);

    if (!hasWebSearchCall || citations.length === 0 || !text) {
      throw new ServiceError(
        502,
        "웹 검색 응답에서 검색 결과 또는 출처를 확인하지 못했습니다.",
      );
    }

    return createTextEventStream(
      `${text}${formatCitationsMarkdown(citations)}`,
    );
  } catch (error) {
    if (isAbortError(error)) {
      console.warn("web-search-ai-chat-timeout", error);
    } else {
      console.error("web-search-ai-chat-fallback", error);
    }

    return streamGeneralAiChat(conversationMessages);
  }
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

  return `당신은 부트캠프/교육 프로그램 상담 기록 분석 전문 AI 도우미입니다.

## 역할
아래는 "${studentName}" 수강생의 여러 차례 상담 원문입니다. 시간 순서로 수강생의 변화 추이, 반복되는 이슈, 개선된 점, 주의 필요 사항을 분석해주세요.

## 상담 기록들
${recordBlocks}

## 응답 가이드라인
- 한국어로 답변합니다.
- 마크다운 서식을 자유롭게 사용합니다.
- 다음 구조로 분석합니다:
  1. **전체 추이 요약** — 수강생의 변화 흐름을 3-5문장으로 정리
  2. **반복되는 이슈** — 여러 상담에 걸쳐 반복 등장하는 문제
  3. **긍정적 변화** — 개선되거나 해소된 부분
  4. **주의 필요 사항** — 악화 경향이나 새로 발견된 위험 신호
  5. **후속 조치 제안** — 다음 상담 방향, 수강생에게 공유할 핵심 포인트
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
      content: "위 상담 기록들을 바탕으로 수강생의 변화 추이를 분석해주세요.",
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
