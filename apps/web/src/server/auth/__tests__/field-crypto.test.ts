import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FieldDecryptError, decryptField, encryptField } from "../field-crypto";

describe("field-crypto", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret-for-field-encryption";
  });

  afterEach(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
      return;
    }

    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it("암호화-복호화 round-trip이 원문을 그대로 복원한다", () => {
    const plain = "google-access-token-1234567890-abcdef";
    const cipher = encryptField(plain);

    expect(cipher.startsWith("v1:")).toBe(true);
    expect(decryptField(cipher)).toBe(plain);
  });

  it("같은 평문도 매번 다른 ciphertext를 만든다 (IV 랜덤성)", () => {
    const plain = "same-plain-text";
    const a = encryptField(plain);
    const b = encryptField(plain);

    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe(plain);
    expect(decryptField(b)).toBe(plain);
  });

  it("ciphertext가 변조되면 복호화에 실패한다", () => {
    const cipher = encryptField("payload");
    const parts = cipher.split(":");
    parts[3] = Buffer.from("tampered-ciphertext").toString("base64");

    expect(() => decryptField(parts.join(":"))).toThrow(FieldDecryptError);
  });

  it("auth tag가 변조되면 복호화에 실패한다", () => {
    const cipher = encryptField("payload");
    const parts = cipher.split(":");
    const tampered = Buffer.from(parts[2], "base64");
    tampered[0] = tampered[0] ^ 0xff;
    parts[2] = tampered.toString("base64");

    expect(() => decryptField(parts.join(":"))).toThrow(FieldDecryptError);
  });

  it("IV가 변조되면 복호화에 실패한다", () => {
    const cipher = encryptField("payload");
    const parts = cipher.split(":");
    const tampered = Buffer.from(parts[1], "base64");
    tampered[0] = tampered[0] ^ 0xff;
    parts[1] = tampered.toString("base64");

    expect(() => decryptField(parts.join(":"))).toThrow(FieldDecryptError);
  });

  it("알 수 없는 버전 prefix는 명시적인 에러를 던진다", () => {
    expect(() => decryptField("v9:aaa:bbb:ccc")).toThrow(FieldDecryptError);
  });

  it("포맷이 깨지면 (콜론 개수 불일치) 명시적인 에러를 던진다", () => {
    expect(() => decryptField("v1:onlytwo:parts")).toThrow(FieldDecryptError);
    expect(() => decryptField("not-a-cipher")).toThrow(FieldDecryptError);
  });

  it("AUTH_SECRET이 회전되면 기존 ciphertext는 복호화에 실패한다", () => {
    const cipher = encryptField("payload");

    process.env.AUTH_SECRET = "rotated-auth-secret-completely-different";

    expect(() => decryptField(cipher)).toThrow(FieldDecryptError);
  });

  it("AUTH_SECRET이 없으면 암호화 시점에 오류를 던진다", () => {
    delete process.env.AUTH_SECRET;

    expect(() => encryptField("payload")).toThrow(
      "AUTH_SECRET 환경변수가 필요합니다.",
    );
  });
});
