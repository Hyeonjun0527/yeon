import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  CreatePublicCheckSessionBody,
  PublicCheckEntry,
  PublicCheckMethod,
  PublicCheckSessionPublic,
  SubmitPublicCheckBody,
  SubmitPublicCheckResult,
  VerifyPublicCheckIdentityBody,
  VerifyPublicCheckIdentityResult,
} from "@yeon/api-contract";

import { getDb } from "@/server/db";
import {
  members,
  publicCheckSessions,
  publicCheckSubmissions,
} from "@/server/db/schema";
import type { RememberedPublicCheckIdentity } from "@/server/services/public-check-device-cookie";
import {
  assertSpaceOwnedByUser,
  persistMemberBoardSnapshot,
} from "@/server/services/student-board-service";

import { ServiceError } from "./service-error";

type PublicCheckSessionRecord = typeof publicCheckSessions.$inferSelect;
type MemberRecord = typeof members.$inferSelect;

type MemberMatchFailure = {
  matched: null;
  verificationStatus: "ambiguous" | "not_ready" | "not_found";
  message: string;
};

type MemberMatchSuccess = {
  matched: MemberRecord;
  verificationStatus: null;
  message: null;
};

type MemberMatchResult = MemberMatchFailure | MemberMatchSuccess;

type SubmitPublicCheckOutcome = {
  spaceId: string;
  result: SubmitPublicCheckResult;
  rememberedMemberId: string | null;
  shouldClearRememberedIdentity: boolean;
};

type VerifyPublicCheckIdentityOutcome = {
  spaceId: string;
  result: VerifyPublicCheckIdentityResult;
  rememberedMemberId: string | null;
};

type GetPublicCheckSessionOutcome = {
  spaceId: string;
  session: PublicCheckSessionPublic;
  shouldClearRememberedIdentity: boolean;
};

function normalizeName(name: string) {
  return name.replace(/\s+/g, "").trim().toLowerCase();
}

function extractPhoneLast4(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function isMethodEnabled(value: unknown, method: PublicCheckMethod) {
  return Array.isArray(value) && value.includes(method);
}

function generatePublicToken() {
  return `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
}

function includesAttendanceCheck(mode: string) {
  return mode !== "assignment_only";
}

function includesAssignmentCheck(mode: string) {
  return mode !== "attendance_only";
}

function getSessionEnabledMethods(session: PublicCheckSessionRecord) {
  return Array.isArray(session.enabledMethods)
    ? (session.enabledMethods as PublicCheckMethod[])
    : (["qr"] as PublicCheckMethod[]);
}

function getIdentityFailureMessage(
  verificationStatus: MemberMatchFailure["verificationStatus"],
) {
  if (verificationStatus === "ambiguous") {
    return "동일한 정보의 수강생이 여러 명이라 운영자 확인이 필요합니다.";
  }

  if (verificationStatus === "not_ready") {
    return "전화번호 정보가 부족해 자동 확인을 완료하지 못했습니다. 운영자에게 문의해 주세요.";
  }

  return "일치하는 수강생을 찾지 못했습니다.";
}

function getSubmittedIdentity(body: {
  name?: string | null;
  phoneLast4?: string | null;
}) {
  const name = body.name?.trim() ?? "";
  const phoneLast4 = body.phoneLast4?.trim() ?? "";

  if (!name || !phoneLast4) {
    return null;
  }

  return {
    name,
    phoneLast4,
  };
}

function matchMemberByIdentityInput(
  memberList: MemberRecord[],
  identity: {
    name: string;
    phoneLast4: string;
  },
): MemberMatchResult {
  const sameNameMembers = memberList.filter(
    (member) => normalizeName(member.name) === normalizeName(identity.name),
  );
  const exactMatches = sameNameMembers.filter(
    (member) => extractPhoneLast4(member.phone) === identity.phoneLast4,
  );

  if (exactMatches.length === 1) {
    return {
      matched: exactMatches[0],
      verificationStatus: null,
      message: null,
    };
  }

  const verificationStatus =
    exactMatches.length > 1
      ? "ambiguous"
      : sameNameMembers.some((member) => !extractPhoneLast4(member.phone))
        ? "not_ready"
        : "not_found";

  return {
    matched: null,
    verificationStatus,
    message: getIdentityFailureMessage(verificationStatus),
  };
}

function haversineMeters(params: {
  latitudeA: number;
  longitudeA: number;
  latitudeB: number;
  longitudeB: number;
}) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(params.latitudeB - params.latitudeA);
  const dLon = toRad(params.longitudeB - params.longitudeA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(params.latitudeA)) *
      Math.cos(toRad(params.latitudeB)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findActivePublicCheckSessionByToken(token: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(publicCheckSessions)
    .where(eq(publicCheckSessions.publicToken, token))
    .limit(1);

  if (!session || session.status !== "active") {
    throw new ServiceError(404, "유효한 체크인 세션을 찾지 못했습니다.");
  }

  const now = new Date();
  if (session.opensAt && session.opensAt.getTime() > now.getTime()) {
    throw new ServiceError(403, "아직 열리지 않은 체크인 세션입니다.");
  }
  if (session.closesAt && session.closesAt.getTime() < now.getTime()) {
    throw new ServiceError(403, "이미 종료된 체크인 세션입니다.");
  }

  return session;
}

async function findSpaceMembers(spaceId: string) {
  return getDb().select().from(members).where(eq(members.spaceId, spaceId));
}

async function findSpaceMemberById(spaceId: string, memberId: string) {
  const [member] = await getDb()
    .select()
    .from(members)
    .where(and(eq(members.spaceId, spaceId), eq(members.id, memberId)))
    .limit(1);

  return member ?? null;
}

function buildPublicCheckSessionPublic(
  session: PublicCheckSessionRecord,
  params: {
    entry: PublicCheckEntry | null;
    rememberedMemberName: string | null;
  },
): PublicCheckSessionPublic {
  const entry = params.entry;
  const requiresPhoneLast4 =
    entry === "qr" ? params.rememberedMemberName === null : true;

  return {
    title: session.title,
    checkMode: session.checkMode as
      | "attendance_only"
      | "assignment_only"
      | "attendance_and_assignment",
    enabledMethods: getSessionEnabledMethods(session),
    locationLabel: session.locationLabel ?? null,
    requiresPhoneLast4,
    rememberedMemberName: params.rememberedMemberName,
  };
}

function buildSubmissionMessage(session: PublicCheckSessionRecord) {
  if (session.checkMode === "attendance_only") {
    return "출석 체크가 완료되었습니다.";
  }

  if (session.checkMode === "assignment_only") {
    return "과제 체크가 완료되었습니다.";
  }

  return "출석과 과제 체크가 완료되었습니다.";
}

export async function createPublicCheckSession(params: {
  userId: string;
  spaceId: string;
  body: CreatePublicCheckSessionBody;
}) {
  await assertSpaceOwnedByUser(params.userId, params.spaceId);

  if (
    params.body.enabledMethods.includes("location") &&
    (!params.body.latitude ||
      !params.body.longitude ||
      !params.body.radiusMeters ||
      !params.body.locationLabel?.trim())
  ) {
    throw new ServiceError(
      400,
      "위치 기반 체크인을 쓰려면 검색 결과에서 기준 위치를 선택하고 반경을 설정해야 합니다.",
    );
  }

  if (
    params.body.enabledMethods.includes("location") &&
    params.body.radiusMeters !== null &&
    params.body.radiusMeters !== undefined &&
    (params.body.radiusMeters < 50 || params.body.radiusMeters > 300)
  ) {
    throw new ServiceError(
      400,
      "위치 기반 체크인 반경은 50m에서 300m 사이로 설정해 주세요.",
    );
  }

  const db = getDb();
  const [session] = await db
    .insert(publicCheckSessions)
    .values({
      spaceId: params.spaceId,
      title: params.body.title.trim(),
      publicToken: generatePublicToken(),
      status: "active",
      checkMode: params.body.checkMode,
      enabledMethods: params.body.enabledMethods,
      verificationMethod: "name_phone_last4",
      opensAt: params.body.opensAt ? new Date(params.body.opensAt) : null,
      closesAt: params.body.closesAt ? new Date(params.body.closesAt) : null,
      locationLabel: params.body.locationLabel?.trim() || null,
      latitude: params.body.latitude ?? null,
      longitude: params.body.longitude ?? null,
      radiusMeters: params.body.radiusMeters ?? null,
      createdByUserId: params.userId,
      updatedAt: new Date(),
    })
    .returning();

  return {
    id: session.id,
    title: session.title,
    status: session.status as "active" | "closed",
    checkMode: session.checkMode as
      | "attendance_only"
      | "assignment_only"
      | "attendance_and_assignment",
    enabledMethods: session.enabledMethods as PublicCheckMethod[],
    publicPath: `/check/${session.publicToken}`,
    opensAt: toIso(session.opensAt),
    closesAt: toIso(session.closesAt),
    locationLabel: session.locationLabel ?? null,
    radiusMeters: session.radiusMeters ?? null,
    createdAt: session.createdAt.toISOString(),
  };
}

export async function updatePublicCheckSession(params: {
  userId: string;
  spaceId: string;
  sessionId: string;
  status?: "active" | "closed";
  closesAt?: string | null;
}) {
  await assertSpaceOwnedByUser(params.userId, params.spaceId);
  const db = getDb();
  const [updated] = await db
    .update(publicCheckSessions)
    .set({
      ...(params.status ? { status: params.status } : {}),
      ...(params.closesAt !== undefined
        ? { closesAt: params.closesAt ? new Date(params.closesAt) : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicCheckSessions.id, params.sessionId),
        eq(publicCheckSessions.spaceId, params.spaceId),
      ),
    )
    .returning();

  if (!updated) {
    throw new ServiceError(404, "체크인 세션을 찾지 못했습니다.");
  }

  return updated;
}

export async function getPublicCheckSessionByToken(params: {
  token: string;
  entry: PublicCheckEntry | null;
  rememberedIdentities?: RememberedPublicCheckIdentity[];
}): Promise<GetPublicCheckSessionOutcome> {
  const session = await findActivePublicCheckSessionByToken(params.token);
  const rememberedMemberId =
    params.rememberedIdentities?.find(
      (identity) => identity.spaceId === session.spaceId,
    )?.memberId ?? null;

  let rememberedMemberName: string | null = null;
  let shouldClearRememberedIdentity = false;

  if (params.entry === "qr" && rememberedMemberId) {
    const rememberedMember = await findSpaceMemberById(
      session.spaceId,
      rememberedMemberId,
    );

    if (rememberedMember) {
      rememberedMemberName = rememberedMember.name;
    } else {
      shouldClearRememberedIdentity = true;
    }
  }

  return {
    spaceId: session.spaceId,
    session: buildPublicCheckSessionPublic(session, {
      entry: params.entry,
      rememberedMemberName,
    }),
    shouldClearRememberedIdentity,
  };
}

export async function verifyPublicCheckIdentity(params: {
  token: string;
  body: VerifyPublicCheckIdentityBody;
}): Promise<VerifyPublicCheckIdentityOutcome> {
  const session = await findActivePublicCheckSessionByToken(params.token);

  if (!isMethodEnabled(session.enabledMethods, "qr")) {
    throw new ServiceError(400, "이 세션은 QR 체크인을 지원하지 않습니다.");
  }

  const memberList = await findSpaceMembers(session.spaceId);
  const match = matchMemberByIdentityInput(memberList, {
    name: params.body.name,
    phoneLast4: params.body.phoneLast4,
  });

  if (!match.matched) {
    return {
      spaceId: session.spaceId,
      result: {
        verificationStatus: match.verificationStatus,
        message: match.message,
        matchedMemberName: null,
      },
      rememberedMemberId: null,
    };
  }

  return {
    spaceId: session.spaceId,
    result: {
      verificationStatus: "matched",
      message: "본인 확인이 완료되었습니다.",
      matchedMemberName: match.matched.name,
    },
    rememberedMemberId: match.matched.id,
  };
}

export async function submitPublicCheck(params: {
  token: string;
  body: SubmitPublicCheckBody;
  rememberedIdentities?: RememberedPublicCheckIdentity[];
}): Promise<SubmitPublicCheckOutcome> {
  const session = await findActivePublicCheckSessionByToken(params.token);
  const rememberedMemberId =
    params.rememberedIdentities?.find(
      (identity) => identity.spaceId === session.spaceId,
    )?.memberId ?? null;

  if (!isMethodEnabled(session.enabledMethods, params.body.method)) {
    throw new ServiceError(
      400,
      "이 체크인 방법은 현재 세션에서 사용할 수 없습니다.",
    );
  }

  const submittedIdentity = getSubmittedIdentity(params.body);
  const shouldUseRememberedIdentity =
    params.body.method === "qr" &&
    !!rememberedMemberId &&
    submittedIdentity === null;

  let matched: MemberRecord | null = null;
  let shouldClearRememberedIdentity = false;

  if (shouldUseRememberedIdentity) {
    matched = await findSpaceMemberById(session.spaceId, rememberedMemberId!);

    if (!matched) {
      shouldClearRememberedIdentity = true;
      throw new ServiceError(
        400,
        "이 기기의 자동 확인 정보가 만료되어 다시 이름과 전화번호를 입력해 주세요.",
      );
    }
  } else {
    if (!submittedIdentity) {
      throw new ServiceError(
        400,
        params.body.method === "location"
          ? "이름과 전화번호 뒤 4자리를 입력한 뒤 위치 기반체크인을 진행해 주세요."
          : "QR 체크인은 처음 1회 이름과 전화번호 뒤 4자리 확인이 필요합니다.",
      );
    }

    const memberList = await findSpaceMembers(session.spaceId);
    const match = matchMemberByIdentityInput(memberList, submittedIdentity);
    const baseSubmission = {
      sessionId: session.id,
      spaceId: session.spaceId,
      checkMethod: params.body.method,
      submittedName: submittedIdentity.name,
      submittedPhoneLast4: submittedIdentity.phoneLast4,
      assignmentStatus: params.body.assignmentStatus ?? null,
      assignmentLink: params.body.assignmentLink?.trim() || null,
      latitude: params.body.latitude ?? null,
      longitude: params.body.longitude ?? null,
    };

    if (!match.matched) {
      await getDb()
        .insert(publicCheckSubmissions)
        .values({
          ...baseSubmission,
          memberId: null,
          verificationStatus: match.verificationStatus,
          distanceMeters: null,
          metadata: null,
        });

      return {
        spaceId: session.spaceId,
        result: {
          verificationStatus: match.verificationStatus,
          message: match.message,
          matchedMemberName: null,
        },
        rememberedMemberId: null,
        shouldClearRememberedIdentity,
      };
    }

    matched = match.matched;
  }

  const matchedPhoneLast4 = extractPhoneLast4(matched.phone);
  if (!matchedPhoneLast4) {
    throw new ServiceError(
      400,
      "전화번호 정보가 부족해 자동 확인을 완료하지 못했습니다. 운영자에게 문의해 주세요.",
    );
  }

  let distanceMeters: number | null = null;
  const shouldMarkAttendance = includesAttendanceCheck(session.checkMode);
  const shouldMarkAssignment = includesAssignmentCheck(session.checkMode);

  if (params.body.method === "location") {
    if (
      session.latitude === null ||
      session.longitude === null ||
      session.radiusMeters === null ||
      params.body.latitude == null ||
      params.body.longitude == null
    ) {
      throw new ServiceError(
        400,
        "위치 기반 체크인에 필요한 좌표 정보가 부족합니다.",
      );
    }

    distanceMeters = haversineMeters({
      latitudeA: session.latitude,
      longitudeA: session.longitude,
      latitudeB: params.body.latitude,
      longitudeB: params.body.longitude,
    });

    if (distanceMeters > session.radiusMeters) {
      await getDb()
        .insert(publicCheckSubmissions)
        .values({
          sessionId: session.id,
          spaceId: session.spaceId,
          memberId: matched.id,
          checkMethod: params.body.method,
          verificationStatus: "outside_radius",
          submittedName: matched.name,
          submittedPhoneLast4: matchedPhoneLast4,
          assignmentStatus: params.body.assignmentStatus ?? null,
          assignmentLink: params.body.assignmentLink?.trim() || null,
          latitude: params.body.latitude ?? null,
          longitude: params.body.longitude ?? null,
          distanceMeters,
          metadata: {
            radiusMeters: session.radiusMeters,
          },
        });

      return {
        spaceId: session.spaceId,
        result: {
          verificationStatus: "outside_radius",
          message: "허용된 위치 반경 밖이라 체크인을 완료하지 못했습니다.",
          matchedMemberName: matched.name,
        },
        rememberedMemberId: null,
        shouldClearRememberedIdentity,
      };
    }
  }

  const happenedAt = new Date();

  await persistMemberBoardSnapshot({
    memberId: matched.id,
    spaceId: session.spaceId,
    attendanceStatus: shouldMarkAttendance ? "present" : undefined,
    assignmentStatus: shouldMarkAssignment
      ? (params.body.assignmentStatus ?? "unknown")
      : undefined,
    assignmentLink: shouldMarkAssignment
      ? (params.body.assignmentLink ?? null)
      : undefined,
    source: params.body.method === "location" ? "public_location" : "public_qr",
    updatedByUserId: null,
    sessionId: session.id,
    happenedAt,
    lastPublicCheckAt: happenedAt,
    historyMode: "always",
    refreshTouchedMarks: true,
  });

  await getDb()
    .insert(publicCheckSubmissions)
    .values({
      sessionId: session.id,
      spaceId: session.spaceId,
      memberId: matched.id,
      checkMethod: params.body.method,
      verificationStatus: "matched",
      submittedName: matched.name,
      submittedPhoneLast4: matchedPhoneLast4,
      assignmentStatus: params.body.assignmentStatus ?? null,
      assignmentLink: params.body.assignmentLink?.trim() || null,
      latitude: params.body.latitude ?? null,
      longitude: params.body.longitude ?? null,
      distanceMeters,
      metadata: null,
    });

  return {
    spaceId: session.spaceId,
    result: {
      verificationStatus: "matched",
      message: buildSubmissionMessage(session),
      matchedMemberName: matched.name,
    },
    rememberedMemberId: params.body.method === "qr" ? matched.id : null,
    shouldClearRememberedIdentity,
  };
}
