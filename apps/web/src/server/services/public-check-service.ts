import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  CreatePublicCheckSessionBody,
  PublicCheckMethod,
  PublicCheckSessionPublic,
  SubmitPublicCheckBody,
  SubmitPublicCheckResult,
  StudentAssignmentStatus,
  StudentAttendanceStatus,
} from "@yeon/api-contract";

import { getDb } from "@/server/db";
import {
  members,
  publicCheckSessions,
  publicCheckSubmissions,
  spaceMemberBoards,
} from "@/server/db/schema";

import { assertSpaceOwnedByUser } from "./student-board-service";
import { ServiceError } from "./service-error";

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

async function upsertPublicBoardState(params: {
  memberId: string;
  spaceId: string;
  attendanceStatus?: StudentAttendanceStatus;
  assignmentStatus?: StudentAssignmentStatus;
  assignmentLink?: string | null;
  source: "public_qr" | "public_location";
}) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(spaceMemberBoards)
    .where(
      and(
        eq(spaceMemberBoards.spaceId, params.spaceId),
        eq(spaceMemberBoards.memberId, params.memberId),
      ),
    )
    .limit(1);

  const now = new Date();
  const nextAttendanceStatus =
    params.attendanceStatus ??
    (existing?.attendanceStatus as StudentAttendanceStatus | undefined) ??
    "unknown";
  const nextAssignmentStatus =
    params.assignmentStatus ??
    (existing?.assignmentStatus as StudentAssignmentStatus | undefined) ??
    "unknown";
  const nextAssignmentLink =
    params.assignmentLink !== undefined
      ? params.assignmentLink?.trim() || null
      : (existing?.assignmentLink ?? null);

  await db
    .insert(spaceMemberBoards)
    .values({
      spaceId: params.spaceId,
      memberId: params.memberId,
      attendanceStatus: nextAttendanceStatus,
      attendanceMarkedAt:
        params.attendanceStatus !== undefined
          ? now
          : (existing?.attendanceMarkedAt ?? null),
      attendanceMarkedSource:
        params.attendanceStatus !== undefined
          ? params.source
          : (existing?.attendanceMarkedSource ?? null),
      assignmentStatus: nextAssignmentStatus,
      assignmentLink: nextAssignmentLink,
      assignmentMarkedAt:
        params.assignmentStatus !== undefined ||
        params.assignmentLink !== undefined
          ? now
          : (existing?.assignmentMarkedAt ?? null),
      assignmentMarkedSource:
        params.assignmentStatus !== undefined ||
        params.assignmentLink !== undefined
          ? params.source
          : (existing?.assignmentMarkedSource ?? null),
      lastPublicCheckAt: now,
      updatedByUserId: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [spaceMemberBoards.spaceId, spaceMemberBoards.memberId],
      set: {
        attendanceStatus: sql`excluded.attendance_status`,
        attendanceMarkedAt: sql`excluded.attendance_marked_at`,
        attendanceMarkedSource: sql`excluded.attendance_marked_source`,
        assignmentStatus: sql`excluded.assignment_status`,
        assignmentLink: sql`excluded.assignment_link`,
        assignmentMarkedAt: sql`excluded.assignment_marked_at`,
        assignmentMarkedSource: sql`excluded.assignment_marked_source`,
        lastPublicCheckAt: sql`excluded.last_public_check_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
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

export async function getPublicCheckSessionByToken(
  token: string,
): Promise<PublicCheckSessionPublic> {
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

  return {
    title: session.title,
    checkMode: session.checkMode as
      | "attendance_only"
      | "assignment_only"
      | "attendance_and_assignment",
    enabledMethods: Array.isArray(session.enabledMethods)
      ? (session.enabledMethods as PublicCheckMethod[])
      : ["qr"],
    locationLabel: session.locationLabel ?? null,
    requiresPhoneLast4: true,
  };
}

export async function submitPublicCheck(params: {
  token: string;
  body: SubmitPublicCheckBody;
}): Promise<SubmitPublicCheckResult> {
  const db = getDb();
  const [session] = await db
    .select()
    .from(publicCheckSessions)
    .where(eq(publicCheckSessions.publicToken, params.token))
    .limit(1);

  if (!session || session.status !== "active") {
    throw new ServiceError(404, "유효한 체크인 세션을 찾지 못했습니다.");
  }

  if (!isMethodEnabled(session.enabledMethods, params.body.method)) {
    throw new ServiceError(
      400,
      "이 체크인 방법은 현재 세션에서 사용할 수 없습니다.",
    );
  }

  const now = new Date();
  if (session.opensAt && session.opensAt.getTime() > now.getTime()) {
    throw new ServiceError(403, "아직 열리지 않은 체크인 세션입니다.");
  }
  if (session.closesAt && session.closesAt.getTime() < now.getTime()) {
    throw new ServiceError(403, "이미 종료된 체크인 세션입니다.");
  }

  const memberList = await db
    .select()
    .from(members)
    .where(eq(members.spaceId, session.spaceId));

  const sameNameMembers = memberList.filter(
    (member) => normalizeName(member.name) === normalizeName(params.body.name),
  );
  const exactMatches = sameNameMembers.filter(
    (member) => extractPhoneLast4(member.phone) === params.body.phoneLast4,
  );

  const baseSubmission = {
    sessionId: session.id,
    spaceId: session.spaceId,
    checkMethod: params.body.method,
    submittedName: params.body.name.trim(),
    submittedPhoneLast4: params.body.phoneLast4,
    assignmentStatus: params.body.assignmentStatus ?? null,
    assignmentLink: params.body.assignmentLink?.trim() || null,
    latitude: params.body.latitude ?? null,
    longitude: params.body.longitude ?? null,
  };

  if (exactMatches.length !== 1) {
    const verificationStatus =
      exactMatches.length > 1
        ? "ambiguous"
        : sameNameMembers.some((member) => !extractPhoneLast4(member.phone))
          ? "not_ready"
          : "not_found";

    await db.insert(publicCheckSubmissions).values({
      ...baseSubmission,
      memberId: null,
      verificationStatus,
      distanceMeters: null,
      metadata: null,
    });

    return {
      verificationStatus,
      message:
        verificationStatus === "ambiguous"
          ? "동일한 정보의 수강생이 여러 명이라 운영자 확인이 필요합니다."
          : verificationStatus === "not_ready"
            ? "전화번호 정보가 부족해 자동 확인을 완료하지 못했습니다. 운영자에게 문의해 주세요."
            : "일치하는 수강생을 찾지 못했습니다.",
      matchedMemberName: null,
    };
  }

  const matched = exactMatches[0];
  let distanceMeters: number | null = null;
  const shouldMarkAttendance = includesAttendanceCheck(session.checkMode);
  const shouldMarkAssignment = includesAssignmentCheck(session.checkMode);

  if (params.body.method === "location") {
    if (
      session.latitude === null ||
      session.longitude === null ||
      session.radiusMeters === null ||
      params.body.latitude === null ||
      params.body.longitude === null
    ) {
      throw new ServiceError(
        400,
        "위치 기반 체크인에 필요한 좌표 정보가 부족합니다.",
      );
    }

    distanceMeters = haversineMeters({
      latitudeA: session.latitude,
      longitudeA: session.longitude,
      latitudeB: params.body.latitude!,
      longitudeB: params.body.longitude!,
    });

    if (distanceMeters > session.radiusMeters) {
      await db.insert(publicCheckSubmissions).values({
        ...baseSubmission,
        memberId: matched.id,
        verificationStatus: "outside_radius",
        distanceMeters,
        metadata: {
          radiusMeters: session.radiusMeters,
        },
      });

      return {
        verificationStatus: "outside_radius",
        message: "허용된 위치 반경 밖이라 체크인을 완료하지 못했습니다.",
        matchedMemberName: matched.name,
      };
    }
  }

  await upsertPublicBoardState({
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
  });

  await db.insert(publicCheckSubmissions).values({
    ...baseSubmission,
    memberId: matched.id,
    verificationStatus: "matched",
    distanceMeters,
    metadata: null,
  });

  return {
    verificationStatus: "matched",
    message:
      session.checkMode === "attendance_only"
        ? "출석 체크가 완료되었습니다."
        : session.checkMode === "assignment_only"
          ? "과제 체크가 완료되었습니다."
          : "출석과 과제 체크가 완료되었습니다.",
    matchedMemberName: matched.name,
  };
}
