import { chatServiceSessionResponseSchema } from "@yeon/api-contract/chat-service";
import { eq } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";

import { getDb } from "@/server/db";
import {
  chatServiceAuthChallenges,
  chatServiceAuthSessions,
  chatServiceProfiles,
} from "@/server/db/schema";
import { ServiceError } from "@/server/services/service-error";

import {
  CHAT_SERVICE_OTP_TTL_MS,
  CHAT_SERVICE_SESSION_TTL_MS,
  buildChatServiceProfileSummary,
  createChatServiceNickname,
  ensureChatServiceSeedData,
  hashChatServiceSecret,
  normalizeChatServicePhoneNumber,
  type ChatServiceProfileRow,
} from "./common";
import { sendChatServiceOtpSms } from "./sms-service";

export const CHAT_SERVICE_SESSION_COOKIE_NAME = "chat-service-session";

type VerifyOtpInput = {
  challengeId: string;
  phoneNumber: string;
  code: string;
};

function isChatServiceOtpBypassEnabled() {
  return process.env.NODE_ENV !== "production";
}

function createChatServiceSessionToken() {
  return randomBytes(24).toString("hex");
}

function createOtpCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

async function getOrCreateChatServiceProfileByPhone(
  phoneNumber: string,
): Promise<ChatServiceProfileRow> {
  const db = getDb();
  const [existingProfile] = await db
    .select()
    .from(chatServiceProfiles)
    .where(eq(chatServiceProfiles.phoneNumber, phoneNumber))
    .limit(1);

  if (existingProfile) {
    return existingProfile;
  }

  const [createdProfile] = await db
    .insert(chatServiceProfiles)
    .values({
      id: randomUUID(),
      phoneNumber,
      nickname: createChatServiceNickname(phoneNumber),
      ageLabel: "20살",
      regionLabel: "서울",
      bio: "",
      points: 1000,
    })
    .returning();

  return createdProfile;
}

export async function requestChatServiceOtp(phoneNumberInput: string) {
  await ensureChatServiceSeedData();

  const db = getDb();
  const phoneNumber = normalizeChatServicePhoneNumber(phoneNumberInput);
  const expiresAt = new Date(Date.now() + CHAT_SERVICE_OTP_TTL_MS);
  const otpCode = createOtpCode();
  const acceptAnyCode = isChatServiceOtpBypassEnabled();
  const [challenge] = await db
    .insert(chatServiceAuthChallenges)
    .values({
      id: randomUUID(),
      phoneNumber,
      codeHash: hashChatServiceSecret(otpCode),
      expiresAt,
    })
    .returning();

  if (!acceptAnyCode) {
    try {
      await sendChatServiceOtpSms({
        otpCode,
        phoneNumber,
      });
    } catch (error) {
      await db
        .delete(chatServiceAuthChallenges)
        .where(eq(chatServiceAuthChallenges.id, challenge.id));

      throw error;
    }
  }

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt.toISOString(),
    acceptAnyCode,
    debugCode: null,
  };
}

export async function verifyChatServiceOtp(input: VerifyOtpInput) {
  await ensureChatServiceSeedData();

  const db = getDb();
  const phoneNumber = normalizeChatServicePhoneNumber(input.phoneNumber);
  const [challenge] = await db
    .select()
    .from(chatServiceAuthChallenges)
    .where(eq(chatServiceAuthChallenges.id, input.challengeId))
    .limit(1);

  if (!challenge || challenge.phoneNumber !== phoneNumber) {
    throw new ServiceError(404, "인증 요청을 찾을 수 없습니다.");
  }

  if (challenge.consumedAt) {
    throw new ServiceError(409, "이미 사용된 인증 요청입니다.");
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new ServiceError(410, "인증번호가 만료되었습니다.");
  }

  if (
    !isChatServiceOtpBypassEnabled() &&
    challenge.codeHash !== hashChatServiceSecret(input.code)
  ) {
    throw new ServiceError(400, "인증번호가 올바르지 않습니다.");
  }

  await db
    .update(chatServiceAuthChallenges)
    .set({
      consumedAt: new Date(),
    })
    .where(eq(chatServiceAuthChallenges.id, challenge.id));

  const profile = await getOrCreateChatServiceProfileByPhone(phoneNumber);
  const sessionToken = createChatServiceSessionToken();
  const expiresAt = new Date(Date.now() + CHAT_SERVICE_SESSION_TTL_MS);

  await db.insert(chatServiceAuthSessions).values({
    id: randomUUID(),
    profileId: profile.id,
    sessionTokenHash: hashChatServiceSecret(sessionToken),
    expiresAt,
  });

  return {
    session: {
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      user: buildChatServiceProfileSummary(profile),
    },
  };
}

export async function getChatServiceAuthByToken(sessionToken?: string | null) {
  if (!sessionToken) {
    return null;
  }

  const db = getDb();
  const sessionTokenHash = hashChatServiceSecret(sessionToken);
  const [session] = await db
    .select()
    .from(chatServiceAuthSessions)
    .where(eq(chatServiceAuthSessions.sessionTokenHash, sessionTokenHash))
    .limit(1);

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await db
      .delete(chatServiceAuthSessions)
      .where(eq(chatServiceAuthSessions.id, session.id));
    return null;
  }

  const [profile] = await db
    .select()
    .from(chatServiceProfiles)
    .where(eq(chatServiceProfiles.id, session.profileId))
    .limit(1);

  if (!profile) {
    return null;
  }

  await db
    .update(chatServiceAuthSessions)
    .set({
      lastAccessedAt: new Date(),
    })
    .where(eq(chatServiceAuthSessions.id, session.id));

  return {
    session,
    profile,
  };
}

export async function getChatServiceSessionState(sessionToken?: string | null) {
  const auth = await getChatServiceAuthByToken(sessionToken);

  if (!auth) {
    return chatServiceSessionResponseSchema.parse({
      authenticated: false,
      session: null,
    });
  }

  return chatServiceSessionResponseSchema.parse({
    authenticated: true,
    session: {
      token: sessionToken,
      expiresAt: auth.session.expiresAt.toISOString(),
      user: buildChatServiceProfileSummary(auth.profile),
    },
  });
}

export async function logoutChatServiceSession(sessionToken?: string | null) {
  if (!sessionToken) {
    return chatServiceSessionResponseSchema.parse({
      authenticated: false,
      session: null,
    });
  }

  const db = getDb();
  await db
    .delete(chatServiceAuthSessions)
    .where(
      eq(
        chatServiceAuthSessions.sessionTokenHash,
        hashChatServiceSecret(sessionToken),
      ),
    );

  return chatServiceSessionResponseSchema.parse({
    authenticated: false,
    session: null,
  });
}
