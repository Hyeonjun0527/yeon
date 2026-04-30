import { customAlphabet } from "nanoid";

/**
 * 외부 노출용 ID 접두사 매핑.
 * DB 내부 PK는 bigint, 외부 노출은 `<prefix>_<nanoid 12자>` 형식.
 */
export const ID_PREFIX = {
  spaces: "spc",
  members: "mem",
  memberFields: "mfd",
  memberTabs: "mtb",
  memberFieldValues: "mfv",
  spaceTemplates: "tpl",
  spaceMemberBoards: "brd",
  spaceMemberBoardHistory: "bhi",
  publicCheckSessions: "pcs",
  publicCheckSubmissions: "pcb",
  sheetIntegrations: "sht",
  sheetIntegrationMemberSnapshots: "shs",
  googledriveTokens: "gdt",
  onedriveTokens: "odt",
  homeInsightBannerDismissals: "hbd",
  importDrafts: "idr",
  counselingRecords: "crd",
  counselingTranscriptSegments: "cts",
  activityLogs: "alg",
  cardDecks: "dck",
  cardDeckItems: "dki",
  lifeOsDays: "lod",
} as const;

export type IdPrefixKey = keyof typeof ID_PREFIX;
export type IdPrefix = (typeof ID_PREFIX)[IdPrefixKey];

const NANOID_BODY_LENGTH = 12;
const NANOID_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";

const generateNanoidBody = customAlphabet(NANOID_ALPHABET, NANOID_BODY_LENGTH);

export class InvalidPublicIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPublicIdError";
  }
}

export function generatePublicId(prefix: IdPrefix): string {
  return `${prefix}_${generateNanoidBody()}`;
}

export function parsePublicId(prefix: IdPrefix, raw: unknown): string {
  if (typeof raw !== "string") {
    throw new InvalidPublicIdError("ID 형식이 올바르지 않습니다.");
  }
  const expected = `${prefix}_`;
  if (!raw.startsWith(expected)) {
    throw new InvalidPublicIdError(`ID 접두사가 ${prefix}이(가) 아닙니다.`);
  }
  const body = raw.slice(expected.length);
  if (body.length !== NANOID_BODY_LENGTH) {
    throw new InvalidPublicIdError("ID 길이가 올바르지 않습니다.");
  }
  for (let i = 0; i < body.length; i += 1) {
    if (NANOID_ALPHABET.indexOf(body[i]!) === -1) {
      throw new InvalidPublicIdError(
        "ID에 허용되지 않은 문자가 포함되어 있습니다.",
      );
    }
  }
  return raw;
}

/**
 * 경계에서 검증 없이 raw 문자열을 그대로 publicId로 취급하는 헬퍼.
 * - `parsePublicId`와 달리 prefix/길이 검증을 건너뛴다.
 * - 이미 검증된 내부 값 또는 잘못된 publicId는 어차피 DB에서 매칭 실패해 404로 떨어진다.
 */
export function toRawPublicId(raw: unknown): string | null {
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}
