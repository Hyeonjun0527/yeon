import {
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const AUTH_SECRET_ENV = "AUTH_SECRET";

function getAuthSecret() {
  const authSecret = process.env[AUTH_SECRET_ENV]?.trim();

  if (!authSecret) {
    throw new Error(`${AUTH_SECRET_ENV} 환경변수가 필요합니다.`);
  }

  return authSecret;
}

let cachedFieldEncryptionKey: { secret: string; key: Buffer } | null = null;

/**
 * AUTH_SECRET을 마스터로 두고 HKDF로 도출한 32바이트 필드 암호화 키.
 * 같은 raw 키를 HMAC 서명과 AES 암호화에 동시에 쓰지 않기 위한 분리이며,
 * 키 회전 호환을 위해 info에 `v1:` 접두사를 둔다.
 */
export function getFieldEncryptionKey(): Buffer {
  const secret = getAuthSecret();
  if (cachedFieldEncryptionKey?.secret === secret) {
    return cachedFieldEncryptionKey.key;
  }

  const ikm = Buffer.from(secret, "utf8");
  const derived = Buffer.from(
    hkdfSync("sha256", ikm, Buffer.alloc(0), "v1:field-encryption", 32),
  );

  cachedFieldEncryptionKey = { secret, key: derived };
  return derived;
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
