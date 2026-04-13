"use client";

import { useEffect } from "react";

import {
  demoBoardRows,
  demoChat,
  demoCheckSessions,
  demoImportDrafts,
  demoMembers,
  demoRecords,
  demoSpaces,
  demoSummary,
  demoTranscript,
} from "../_data/demo-seed";

type DemoSpace = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type DemoMember = {
  id: string;
  spaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  initialRiskLevel: "low" | "medium" | "high" | null;
  aiRiskLevel: "low" | "medium" | "high" | null;
  aiRiskSummary: string | null;
  aiRiskSignals: string[];
  riskSource: "manual" | "counseling_ai" | null;
  counselingRecordCount: number;
  lastCounselingAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DemoRecordListItem = {
  id: string;
  spaceId: string;
  memberId: string | null;
  createdAt: string;
  sessionTitle: string;
  studentName: string;
  status: "ready" | "processing" | "error";
  preview: string;
  audioDurationMs: number;
  counselingType: string;
  errorMessage: string | null;
  processingStage: "uploaded" | "transcribing" | "analyzing" | "completed";
  processingProgress: number;
  processingMessage: string | null;
  analysisStatus: "idle" | "processing" | "completed" | "error";
  analysisProgress: number;
};

type DemoRecordDetail = DemoRecordListItem & {
  audioUrl: string | null;
  transcriptSegments: Array<{
    id: string;
    segmentIndex: number;
    startMs: number | null;
    endMs: number | null;
    speakerLabel: string;
    speakerTone: "teacher" | "student" | "unknown";
    text: string;
  }>;
  assistantMessages: Array<{
    role: "assistant" | "user";
    content: string;
    createdAt: string;
  }>;
  analysisResult: {
    summary: string;
    member: {
      name: string;
      traits: string[];
      emotion: string;
    };
    issues: Array<{ title: string; detail: string; timestamp: string | null }>;
    actions: {
      mentor: string[];
      member: string[];
      nextSession: string[];
    };
    keywords: string[];
  } | null;
};

type DemoStore = {
  spaces: DemoSpace[];
  members: DemoMember[];
  records: DemoRecordListItem[];
  recordDetails: Record<string, DemoRecordDetail>;
  boardRows: Array<{
    memberId: string;
    attendanceStatus: "unknown" | "present" | "absent";
    assignmentStatus: "unknown" | "done" | "not_done";
    assignmentLink: string | null;
    isSelfCheckReady: boolean;
    lastPublicCheckAt: string | null;
  }>;
  boardSessions: Array<{
    id: string;
    title: string;
    checkMode:
      | "attendance_only"
      | "assignment_only"
      | "attendance_and_assignment";
    enabledMethods: Array<"qr" | "location">;
    status: "active" | "closed";
    publicPath: string;
    locationLabel: string | null;
    radiusMeters: number | null;
  }>;
  memberTabs: Array<{
    id: string;
    name: string;
    tabType: "system" | "custom";
    systemKey: string | null;
    isVisible: boolean;
    displayOrder: number;
  }>;
  memberMemos: Record<
    string,
    Array<{
      id: string;
      memberId: string;
      spaceId: string;
      type: string;
      status: string | null;
      recordedAt: string;
      source: string;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>
  >;
};

const DEMO_SPACE_ID = demoSpaces[0]?.id ?? "space-7";
const nowIso = "2026-04-12T14:10:00.000Z";
const demoLocationSearchResults = [
  {
    id: "keyword:demo-1",
    label: "패스트캠퍼스 강남캠퍼스 · 서울 강남구 테헤란로 231",
    placeName: "패스트캠퍼스 강남캠퍼스",
    roadAddressName: "서울 강남구 테헤란로 231",
    addressName: "서울 강남구 역삼동 647-3",
    latitude: 37.5012,
    longitude: 127.0396,
    source: "keyword" as const,
  },
  {
    id: "address:서울 강남구 테헤란로 427:127.056:37.504",
    label: "위워크타워 · 서울 강남구 테헤란로 427",
    placeName: "위워크타워",
    roadAddressName: "서울 강남구 테헤란로 427",
    addressName: "서울 강남구 삼성동 142-43",
    latitude: 37.504,
    longitude: 127.056,
    source: "address" as const,
  },
  {
    id: "keyword:demo-2",
    label: "마루180 · 서울 강남구 역삼로 180",
    placeName: "마루180",
    roadAddressName: "서울 강남구 역삼로 180",
    addressName: "서울 강남구 역삼동 702-10",
    latitude: 37.4967,
    longitude: 127.0386,
    source: "keyword" as const,
  },
];

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function createSseResponse(chunks: Array<{ content: string }>) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    },
  );
}

function buildAnalysisResult(memberName: string) {
  return {
    summary: demoSummary.core.join(" "),
    member: {
      name: memberName,
      traits: ["착수 허들 높음", "보호자 협업 필요"],
      emotion: "과제 시작에 대한 부담과 미루기 패턴이 보입니다.",
    },
    issues: demoSummary.issues.map((issue, index) => ({
      title: `이슈 ${index + 1}`,
      detail: issue,
      timestamp: null,
    })),
    actions: {
      mentor: [demoSummary.actions[0] ?? "착수 시간 고정"],
      member: [demoSummary.actions[1] ?? "체크리스트 기반 진행"],
      nextSession: [demoSummary.actions[2] ?? "다음 상담 전 체크 기록 확인"],
    },
    keywords: ["과제", "착수", "보호자", "체크리스트"],
  };
}

function createInitialStore(): DemoStore {
  const spaces: DemoSpace[] = demoSpaces.map((space, index) => ({
    id: space.id,
    name: `${space.name} 스페이스`,
    description:
      index === 0 ? "상담 기록 워크스페이스 데모" : "보조 데모 스페이스",
    startDate: "2026-03-01",
    endDate: null,
    createdAt: `2026-03-0${index + 1}T09:00:00.000Z`,
    updatedAt: nowIso,
  }));

  const members: DemoMember[] = demoMembers.map((member, index) => ({
    id: `s${index + 1}`,
    spaceId: DEMO_SPACE_ID,
    name: member.name,
    email: `demo-student-${index + 1}@yeon.local`,
    phone: `010-12${String(index + 10).padStart(2, "0")}-34${String(index + 10).padStart(2, "0")}`,
    status: member.status === "휴학" ? "withdrawn" : "active",
    initialRiskLevel: member.risk as "low" | "medium" | "high",
    aiRiskLevel: member.risk as "low" | "medium" | "high",
    aiRiskSummary: `${member.name} 학생의 최근 상담/과제 흐름 기준 ${member.risk} 위험도로 분류되었습니다.`,
    aiRiskSignals: ["과제 착수 지연", "보호자 요청 존재"],
    riskSource: "counseling_ai",
    counselingRecordCount: member.recordCount,
    lastCounselingAt:
      index === 0 ? nowIso : `2026-04-1${Math.min(index, 8)}T10:00:00.000Z`,
    createdAt: `2026-03-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
    updatedAt: nowIso,
  }));

  const records: DemoRecordListItem[] = demoRecords.map((record, index) => ({
    id: record.id,
    spaceId: DEMO_SPACE_ID,
    memberId: members[index]?.id ?? null,
    createdAt: `2026-04-1${index + 1}T1${index}:10:00.000Z`,
    sessionTitle: record.sessionTitle,
    studentName: record.studentName,
    status: record.status as DemoRecordListItem["status"],
    preview: demoSummary.core[0] ?? "상담 요약이 준비되었습니다.",
    audioDurationMs: 1000 * 60 * (18 + index * 4),
    counselingType: "대면 상담",
    errorMessage: null,
    processingStage: record.status === "ready" ? "completed" : "analyzing",
    processingProgress: record.status === "ready" ? 100 : 72,
    processingMessage:
      record.status === "ready"
        ? "분석이 완료되었습니다."
        : "AI 요약을 생성하고 있습니다.",
    analysisStatus: record.status === "ready" ? "completed" : "processing",
    analysisProgress: record.status === "ready" ? 100 : 68,
  }));

  const recordDetails = Object.fromEntries(
    records.map((record, index) => [
      record.id,
      {
        ...record,
        audioUrl: null,
        transcriptSegments: demoTranscript.map((segment, segmentIndex) => ({
          id: `${record.id}-segment-${segmentIndex + 1}`,
          segmentIndex,
          startMs: segmentIndex * 14000,
          endMs: segmentIndex * 14000 + 12000,
          speakerLabel: segment.speaker,
          speakerTone:
            segment.speaker === "교사"
              ? "teacher"
              : segment.speaker === "학생"
                ? "student"
                : "unknown",
          text: segment.text,
        })),
        assistantMessages: demoChat.map((message, messageIndex) => ({
          role: message.role,
          content: message.content,
          createdAt: `2026-04-12T14:${10 + messageIndex}:00.000Z`,
        })),
        analysisResult:
          record.status === "ready"
            ? buildAnalysisResult(record.studentName)
            : index === 0
              ? buildAnalysisResult(record.studentName)
              : null,
      },
    ]),
  ) as Record<string, DemoRecordDetail>;

  const boardRows: DemoStore["boardRows"] = members.map((member, index) => ({
    memberId: member.id,
    attendanceStatus:
      demoBoardRows[index]?.attendance === "출석" ? "present" : "unknown",
    assignmentStatus:
      demoBoardRows[index]?.assignment === "완료" ? "done" : "unknown",
    assignmentLink: demoBoardRows[index]?.link || null,
    isSelfCheckReady: !!member.phone,
    lastPublicCheckAt: index < 3 ? nowIso : null,
  }));

  const boardSessions: DemoStore["boardSessions"] = demoCheckSessions.map(
    (session, index) => ({
      id: `check-session-${index + 1}`,
      title: session.title,
      checkMode:
        session.methods === "QR + 위치"
          ? "attendance_and_assignment"
          : "attendance_only",
      enabledMethods:
        session.methods === "QR + 위치" ? ["qr", "location"] : ["qr"],
      status: session.status === "열림" ? "active" : "closed",
      publicPath: `/check/demo-${index + 1}`,
      locationLabel: session.detail,
      radiusMeters: 120,
    }),
  );

  const memberTabs = [
    {
      id: "tab-overview",
      name: "개요",
      tabType: "system" as const,
      systemKey: "overview",
      isVisible: true,
      displayOrder: 1,
    },
    {
      id: "tab-counseling",
      name: "상담기록",
      tabType: "system" as const,
      systemKey: "counseling",
      isVisible: true,
      displayOrder: 2,
    },
    {
      id: "tab-memos",
      name: "메모",
      tabType: "system" as const,
      systemKey: "memos",
      isVisible: true,
      displayOrder: 3,
    },
    {
      id: "tab-report",
      name: "리포트",
      tabType: "system" as const,
      systemKey: "report",
      isVisible: true,
      displayOrder: 4,
    },
  ];

  const memberMemos = Object.fromEntries(
    members.map((member, index) => [
      member.id,
      [
        {
          id: `memo-${member.id}-1`,
          memberId: member.id,
          spaceId: member.spaceId,
          type: "coaching-note",
          status: null,
          recordedAt: `2026-04-1${Math.min(index + 1, 9)}T09:00:00.000Z`,
          source: "demo",
          metadata: {
            noteText: `${member.name} 학생은 과제 착수 구조 점검이 필요합니다.`,
            authorLabel: "멘토",
          },
          createdAt: `2026-04-1${Math.min(index + 1, 9)}T09:00:00.000Z`,
        },
      ],
    ]),
  ) as DemoStore["memberMemos"];

  return {
    spaces,
    members,
    records,
    recordDetails,
    boardRows,
    boardSessions,
    memberTabs,
    memberMemos,
  };
}

let demoStore = createInitialStore();

async function handleMockApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url, window.location.origin);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (path === "/api/v1/spaces" && method === "GET") {
    return createJsonResponse({ spaces: demoStore.spaces });
  }

  if (path === "/api/v1/spaces" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const space = {
      id: `space-${demoStore.spaces.length + 1}`,
      name: body.name?.trim() || `새 스페이스 ${demoStore.spaces.length + 1}`,
      description: null,
      startDate: null,
      endDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    } satisfies DemoSpace;
    demoStore = { ...demoStore, spaces: [space, ...demoStore.spaces] };
    return createJsonResponse({ space }, 201);
  }

  if (path === "/api/v1/counseling-records" && method === "GET") {
    return createJsonResponse({ records: demoStore.records });
  }

  const recordDetailMatch = path.match(
    /^\/api\/v1\/counseling-records\/([^/]+)$/,
  );
  if (recordDetailMatch && method === "GET") {
    const record = demoStore.recordDetails[recordDetailMatch[1]];
    return record
      ? createJsonResponse({ record })
      : createJsonResponse({ message: "상담 기록을 찾지 못했습니다." }, 404);
  }

  if (path === "/api/v1/counseling-records/details" && method === "POST") {
    const body = (await request.json().catch(() => ({ recordIds: [] }))) as {
      recordIds?: string[];
    };
    const recordIds = body.recordIds ? body.recordIds : [];
    const records = recordIds
      .map((id) => demoStore.recordDetails[id])
      .filter(Boolean);
    return createJsonResponse({ records });
  }

  const chatMatch = path.match(
    /^\/api\/v1\/counseling-records\/([^/]+)\/chat$/,
  );
  if (chatMatch && method === "DELETE") {
    const record = demoStore.recordDetails[chatMatch[1]];
    if (!record) {
      return createJsonResponse(
        { message: "상담 기록을 찾지 못했습니다." },
        404,
      );
    }
    demoStore.recordDetails[chatMatch[1]] = {
      ...record,
      assistantMessages: [],
    };
    return createJsonResponse({ ok: true });
  }

  if (chatMatch && method === "POST") {
    const record = demoStore.recordDetails[chatMatch[1]];
    if (!record) {
      return createJsonResponse(
        { message: "상담 기록을 찾지 못했습니다." },
        404,
      );
    }
    const body = (await request.json().catch(() => ({ messages: [] }))) as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };
    const lastUserMessage = body.messages?.at(-1)?.content ?? "질문";
    record.assistantMessages = [
      ...record.assistantMessages,
      {
        role: "user",
        content: lastUserMessage,
        createdAt: nowIso,
      },
      {
        role: "assistant",
        content: `원문 기준 답변입니다: ${lastUserMessage}에 대해 현재 상담 기록의 핵심 포인트를 정리했습니다.`,
        createdAt: nowIso,
      },
    ];
    return createSseResponse([
      { content: `원문 기준 답변입니다: ${lastUserMessage}` },
      { content: "에 대해 현재 상담 기록의 핵심 포인트를 정리했습니다." },
    ]);
  }

  const analyzeMatch = path.match(
    /^\/api\/v1\/counseling-records\/([^/]+)\/analyze$/,
  );
  if (analyzeMatch && method === "POST") {
    const record = demoStore.recordDetails[analyzeMatch[1]];
    if (!record) {
      return createJsonResponse(
        { message: "상담 기록을 찾지 못했습니다." },
        404,
      );
    }
    const analysisResult =
      record.analysisResult ?? buildAnalysisResult(record.studentName);
    demoStore.recordDetails[analyzeMatch[1]] = {
      ...record,
      analysisResult,
    };
    return createJsonResponse({ analysisResult });
  }

  if (path === "/api/v1/integrations/googledrive/status" && method === "GET") {
    return createJsonResponse({ connected: false, sheetSyncReady: false });
  }

  if (path === "/api/v1/integrations/local/drafts" && method === "GET") {
    return createJsonResponse({
      drafts: demoImportDrafts.map((draft, index) => ({
        id: `draft-${index + 1}`,
        status: draft.status === "분석 완료" ? "analyzed" : "edited",
        selectedFile: { name: draft.fileName },
        processingMessage: draft.description,
        error: null,
        updatedAt: nowIso,
        expiresAt: "2026-04-19T00:00:00.000Z",
      })),
    });
  }

  const membersMatch = path.match(/^\/api\/v1\/spaces\/([^/]+)\/members$/);
  if (membersMatch && method === "GET") {
    return createJsonResponse({
      members: demoStore.members.filter(
        (member) => member.spaceId === membersMatch[1],
      ),
    });
  }

  if (membersMatch && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string | null;
      phone?: string | null;
      status?: string | null;
      initialRiskLevel?: "low" | "medium" | "high" | null;
    };
    const member: DemoMember = {
      id: `s${demoStore.members.length + 1}`,
      spaceId: membersMatch[1],
      name: body.name?.trim() || `데모 수강생 ${demoStore.members.length + 1}`,
      email: body.email ?? null,
      phone: body.phone ?? null,
      status: body.status ?? "active",
      initialRiskLevel: body.initialRiskLevel ?? null,
      aiRiskLevel: body.initialRiskLevel ?? null,
      aiRiskSummary: null,
      aiRiskSignals: [],
      riskSource: "manual",
      counselingRecordCount: 0,
      lastCounselingAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    demoStore = {
      ...demoStore,
      members: [member, ...demoStore.members],
      memberMemos: { ...demoStore.memberMemos, [member.id]: [] },
      boardRows: [
        {
          memberId: member.id,
          attendanceStatus: "unknown",
          assignmentStatus: "unknown",
          assignmentLink: null,
          isSelfCheckReady: !!member.phone,
          lastPublicCheckAt: null,
        },
        ...demoStore.boardRows,
      ],
    };
    return createJsonResponse({ member }, 201);
  }

  const singleMemberMatch = path.match(/^\/api\/v1\/members\/([^/]+)$/);
  if (singleMemberMatch && method === "GET") {
    const member = demoStore.members.find(
      (item) => item.id === singleMemberMatch[1],
    );
    return member
      ? createJsonResponse({ member })
      : createJsonResponse({ message: "수강생을 찾지 못했습니다." }, 404);
  }

  const memberTabsMatch = path.match(
    /^\/api\/v1\/spaces\/([^/]+)\/member-tabs$/,
  );
  if (memberTabsMatch && method === "GET") {
    return createJsonResponse({ tabs: demoStore.memberTabs });
  }

  const memberRecordsMatch = path.match(
    /^\/api\/v1\/spaces\/([^/]+)\/members\/([^/]+)\/counseling-records$/,
  );
  if (memberRecordsMatch && method === "GET") {
    return createJsonResponse({
      records: demoStore.records.filter(
        (record) => record.memberId === memberRecordsMatch[2],
      ),
    });
  }

  const memberLogsMatch = path.match(
    /^\/api\/v1\/spaces\/([^/]+)\/members\/([^/]+)\/activity-logs$/,
  );
  if (memberLogsMatch && method === "GET") {
    const logs = demoStore.memberMemos[memberLogsMatch[2]]
      ? demoStore.memberMemos[memberLogsMatch[2]]
      : [];
    return createJsonResponse({ logs, totalCount: logs.length });
  }

  if (memberLogsMatch && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { text?: string };
    const log = {
      id: `memo-${memberLogsMatch[2]}-${Date.now()}`,
      memberId: memberLogsMatch[2],
      spaceId: memberLogsMatch[1],
      type: "coaching-note",
      status: null,
      recordedAt: nowIso,
      source: "demo",
      metadata: {
        noteText: body.text ?? "",
        authorLabel: "멘토",
      },
      createdAt: nowIso,
    };
    const existingLogs = demoStore.memberMemos[memberLogsMatch[2]]
      ? demoStore.memberMemos[memberLogsMatch[2]]
      : [];
    demoStore.memberMemos[memberLogsMatch[2]] = [log, ...existingLogs];
    return createJsonResponse({ log }, 201);
  }

  const publicCheckLocationMatch = path.match(
    /^\/api\/v1\/spaces\/([^/]+)\/public-check-locations$/,
  );
  if (publicCheckLocationMatch && method === "GET") {
    const query = url.searchParams.get("query")?.trim() ?? "";
    const loweredQuery = query.toLowerCase();
    const results =
      query.length < 2
        ? []
        : demoLocationSearchResults.filter((result) =>
            [
              result.label,
              result.placeName,
              result.roadAddressName,
              result.addressName,
            ]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(loweredQuery)),
          );

    return createJsonResponse({ results });
  }

  const boardMatch = path.match(/^\/api\/v1\/spaces\/([^/]+)\/student-board$/);
  if (boardMatch && method === "GET") {
    return createJsonResponse({
      rows: demoStore.boardRows,
      sessions: demoStore.boardSessions,
    });
  }

  if (boardMatch && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      checkMode?:
        | "attendance_only"
        | "assignment_only"
        | "attendance_and_assignment";
      enabledMethods?: Array<"qr" | "location">;
      locationLabel?: string | null;
      radiusMeters?: number | null;
    };
    const session: DemoStore["boardSessions"][number] = {
      id: `check-session-${demoStore.boardSessions.length + 1}`,
      title: body.title?.trim() || "새 체크인 세션",
      checkMode: body.checkMode ?? "attendance_and_assignment",
      enabledMethods: body.enabledMethods?.length
        ? body.enabledMethods
        : ["qr"],
      status: "active" as const,
      publicPath: `/check/demo-${demoStore.boardSessions.length + 1}`,
      locationLabel: body.locationLabel ?? null,
      radiusMeters: body.radiusMeters ?? null,
    };
    demoStore.boardSessions = [session, ...demoStore.boardSessions];
    return createJsonResponse({ session }, 201);
  }

  const boardMemberMatch = path.match(
    /^\/api\/v1\/spaces\/([^/]+)\/student-board\/([^/]+)$/,
  );
  if (boardMemberMatch && method === "PATCH") {
    const body = (await request.json().catch(() => ({}))) as {
      attendanceStatus?: "unknown" | "present" | "absent";
      assignmentStatus?: "unknown" | "done" | "not_done";
      assignmentLink?: string | null;
    };
    demoStore.boardRows = demoStore.boardRows.map((row) =>
      row.memberId === boardMemberMatch[2]
        ? {
            ...row,
            attendanceStatus: body.attendanceStatus ?? row.attendanceStatus,
            assignmentStatus: body.assignmentStatus ?? row.assignmentStatus,
            assignmentLink: body.assignmentLink ?? row.assignmentLink,
            lastPublicCheckAt: nowIso,
          }
        : row,
    );
    return createJsonResponse({
      rows: demoStore.boardRows,
      sessions: demoStore.boardSessions,
    });
  }

  const sessionMatch = path.match(
    /^\/api\/v1\/spaces\/([^/]+)\/public-check-sessions\/([^/]+)$/,
  );
  if (sessionMatch && method === "PATCH") {
    const body = (await request.json().catch(() => ({}))) as {
      status?: "active" | "closed";
    };
    demoStore.boardSessions = demoStore.boardSessions.map((session) =>
      session.id === sessionMatch[2]
        ? { ...session, status: body.status ?? session.status }
        : session,
    );
    return createJsonResponse({ ok: true });
  }

  if (path === "/api/v1/auth/session" && method === "DELETE") {
    return createJsonResponse({ authenticated: false, user: null });
  }

  return null;
}

export function MockDemoProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request
          ? input
          : new Request(
              typeof input === "string" ? input : input.toString(),
              init,
            );

      const mockedResponse = await handleMockApi(request);

      if (mockedResponse) {
        return mockedResponse;
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}
