import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { getFieldEncryptionKey } from "./crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTE_LENGTH = 12;
const TAG_BYTE_LENGTH = 16;

export class FieldDecryptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldDecryptError";
  }
}

/**
 * 외부 시스템 access/refresh token 등 민감 필드를 AES-256-GCM으로 암호화한다.
 * 출력 포맷: `v1:<base64 iv>:<base64 tag>:<base64 ciphertext>`
 * 향후 키 회전이 필요하면 `v2:` 등으로 prefix를 늘려 호환을 유지한다.
 */
export function encryptField(plain: string): string {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getFieldEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptField(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4) {
    throw new FieldDecryptError("필드 암호문 포맷이 올바르지 않습니다.");
  }

  const [version, ivB64, tagB64, ctB64] = parts;
  if (version !== VERSION) {
    throw new FieldDecryptError(
      `지원하지 않는 필드 암호문 버전입니다: ${version}`,
    );
  }

  const iv = Buffer.from(ivB64, "base64");
  if (iv.length !== IV_BYTE_LENGTH) {
    throw new FieldDecryptError("필드 암호문 IV 길이가 올바르지 않습니다.");
  }

  const tag = Buffer.from(tagB64, "base64");
  if (tag.length !== TAG_BYTE_LENGTH) {
    throw new FieldDecryptError(
      "필드 암호문 인증 태그 길이가 올바르지 않습니다.",
    );
  }

  const ciphertext = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getFieldEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  try {
    const plain = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    throw new FieldDecryptError("필드 복호화에 실패했습니다.");
  }
}
