import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const AUTH_SECRET_ENV = "AUTH_SECRET";

function getAuthSecret() {
  const authSecret = process.env[AUTH_SECRET_ENV]?.trim();

  if (!authSecret) {
    throw new Error(`${AUTH_SECRET_ENV} 환경변수가 필요합니다.`);
  }

  return authSecret;
}

export function createAuthRandomToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function signAuthValue(value: string) {
  return createHmac("sha256", getAuthSecret())
    .update(value)
    .digest("base64url");
}

export function verifySignedAuthValue(value: string, signature: string) {
  const expectedSignature = signAuthValue(value);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function hashAuthToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}
