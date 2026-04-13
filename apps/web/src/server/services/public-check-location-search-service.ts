import proj4 from "proj4";
import { z } from "zod";
import type {
  PublicCheckLocationSearchResponse,
  PublicCheckLocationSearchResult,
} from "@yeon/api-contract";

import { ServiceError } from "./service-error";

const JUSO_SEARCH_API_URL =
  "https://business.juso.go.kr/addrlink/addrLinkApi.do";
const JUSO_COORD_API_URL =
  "https://business.juso.go.kr/addrlink/addrCoordApi.do";
const JUSO_API_TIMEOUT_MS = 7000;
const MAX_LOCATION_SEARCH_RESULTS = 6;
const WGS84_PROJECTION = "WGS84";
const JUSO_UTMK_PROJECTION =
  "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";

const jusoCommonSchema = z.object({
  errorCode: z.string().min(1),
  errorMessage: z.string().min(1),
  totalCount: z.string().optional(),
  currentPage: z.string().optional(),
  countPerPage: z.string().optional(),
});

const jusoSearchItemSchema = z.object({
  roadAddr: z.string().min(1),
  roadAddrPart1: z.string().min(1),
  roadAddrPart2: z.string().optional(),
  jibunAddr: z.string().min(1),
  admCd: z.string().min(1),
  rnMgtSn: z.string().min(1),
  bdMgtSn: z.string().min(1),
  detBdNmList: z.string().optional(),
  bdNm: z.string().optional(),
  udrtYn: z.string().min(1),
  buldMnnm: z.string().min(1),
  buldSlno: z.string().min(1),
});

const jusoSearchResponseSchema = z.object({
  results: z.object({
    common: jusoCommonSchema,
    juso: z.array(jusoSearchItemSchema).optional().default([]),
  }),
});

const jusoCoordItemSchema = z.object({
  admCd: z.string().min(1),
  rnMgtSn: z.string().min(1),
  bdMgtSn: z.string().min(1),
  udrtYn: z.string().min(1),
  buldMnnm: z.string().min(1),
  buldSlno: z.string().min(1),
  entX: z.string().min(1),
  entY: z.string().min(1),
  bdNm: z.string().optional(),
});

const jusoCoordResponseSchema = z.object({
  results: z.object({
    common: jusoCommonSchema,
    juso: z.array(jusoCoordItemSchema).optional().default([]),
  }),
});

type JusoSearchItem = z.infer<typeof jusoSearchItemSchema>;
type JusoCoordItem = z.infer<typeof jusoCoordItemSchema>;
type JusoApiEnvelope<TItem> = {
  results: {
    common: z.infer<typeof jusoCommonSchema>;
    juso: TItem[];
  };
};

function getRequiredJusoApiConfirmKey() {
  const value = process.env.JUSO_API_CONFIRM_KEY?.trim();

  if (!value) {
    throw new ServiceError(500, "JUSO_API_CONFIRM_KEY가 설정되지 않았습니다.");
  }

  return value;
}

function parseNumberString(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ServiceError(502, `Juso 응답의 ${label} 값이 올바르지 않습니다.`);
  }

  return parsed;
}

function mapJusoApiError(errorCode: string, errorMessage: string) {
  switch (errorCode) {
    case "E0001":
      return new ServiceError(
        500,
        "JUSO_API_CONFIRM_KEY 설정 또는 승인키 권한을 확인해 주세요.",
      );
    case "E0014":
      return new ServiceError(
        500,
        "Juso 개발승인키 사용 기간이 만료됐습니다. 새 승인키를 발급받아 주세요.",
      );
    case "E0007":
      return new ServiceError(
        429,
        "Juso 주소 검색 요청이 잠시 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    case "E0005":
    case "E0006":
    case "E0008":
    case "E0009":
    case "E0010":
    case "E0011":
    case "E0012":
    case "E0013":
      return new ServiceError(400, errorMessage);
    default:
      return new ServiceError(
        502,
        errorMessage || "Juso 주소 검색 요청이 실패했습니다.",
      );
  }
}

async function fetchJusoJson<
  TSchema extends JusoApiEnvelope<unknown>,
>(options: {
  url: string;
  params: Record<string, string>;
  schema: z.ZodType<TSchema>;
  contextLabel: string;
}) {
  const requestUrl = new URL(options.url);

  Object.entries(options.params).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, value);
  });
  requestUrl.searchParams.set("resultType", "json");

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      signal: AbortSignal.timeout(JUSO_API_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`${options.contextLabel}: Juso 요청 실패`, error);
    throw new ServiceError(502, "Juso 주소 검색 요청이 실패했습니다.");
  }

  const rawBody = await response.text();
  let parsedBody: unknown = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      console.error(`${options.contextLabel}: JSON 파싱 실패`, rawBody);
      throw new ServiceError(502, "Juso 주소 검색 응답을 해석하지 못했습니다.");
    }
  }

  const parsed = options.schema.safeParse(parsedBody);

  if (!parsed.success) {
    console.error(`${options.contextLabel}: 응답 스키마 불일치`, {
      issues: parsed.error.issues,
      body: parsedBody,
      status: response.status,
    });
    throw new ServiceError(
      502,
      "Juso 주소 검색 응답 형식이 올바르지 않습니다.",
    );
  }

  const { common } = parsed.data.results;

  if (!response.ok || common.errorCode !== "0") {
    console.error(`${options.contextLabel}: Juso 응답 오류`, {
      status: response.status,
      body: parsedBody,
    });
    throw mapJusoApiError(common.errorCode, common.errorMessage);
  }

  return parsed.data;
}

function pickPlaceName(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    const normalized = candidate
      ?.split(",")
      .map((value) => value.trim())
      .find(Boolean);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function convertUtmkToWgs84(entX: string, entY: string) {
  const x = parseNumberString(entX, "X좌표");
  const y = parseNumberString(entY, "Y좌표");
  const [longitude, latitude] = proj4(JUSO_UTMK_PROJECTION, WGS84_PROJECTION, [
    x,
    y,
  ]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ServiceError(502, "Juso 좌표를 위경도로 변환하지 못했습니다.");
  }

  return { latitude, longitude };
}

async function fetchJusoCoordinates(
  document: JusoSearchItem,
  confirmKey: string,
) {
  const coordResponse = await fetchJusoJson({
    url: JUSO_COORD_API_URL,
    params: {
      confmKey: confirmKey,
      admCd: document.admCd,
      rnMgtSn: document.rnMgtSn,
      udrtYn: document.udrtYn,
      buldMnnm: document.buldMnnm,
      buldSlno: document.buldSlno,
    },
    schema: jusoCoordResponseSchema,
    contextLabel: "Juso 좌표 검색",
  });

  const [coordDocument] = coordResponse.results.juso;

  if (!coordDocument) {
    throw new ServiceError(502, "Juso 좌표 검색 결과가 비어 있습니다.");
  }

  return coordDocument;
}

function normalizeJusoResult(
  searchDocument: JusoSearchItem,
  coordDocument: JusoCoordItem,
): PublicCheckLocationSearchResult {
  const { latitude, longitude } = convertUtmkToWgs84(
    coordDocument.entX,
    coordDocument.entY,
  );
  const placeName = pickPlaceName(
    searchDocument.bdNm,
    searchDocument.detBdNmList,
    coordDocument.bdNm,
  );
  const roadAddress = searchDocument.roadAddr.trim();
  const primaryRoadAddress = searchDocument.roadAddrPart1.trim();

  return {
    id: `juso:${searchDocument.bdMgtSn}`,
    label: placeName ? `${placeName} · ${primaryRoadAddress}` : roadAddress,
    placeName,
    roadAddressName: roadAddress,
    addressName: searchDocument.jibunAddr.trim(),
    latitude,
    longitude,
    source: placeName ? "keyword" : "address",
  };
}

function dedupeLocationResults(results: PublicCheckLocationSearchResult[]) {
  const deduped = new Map<string, PublicCheckLocationSearchResult>();

  for (const result of results) {
    const key = [
      result.roadAddressName ?? "",
      result.addressName ?? "",
      result.latitude.toFixed(6),
      result.longitude.toFixed(6),
    ].join(":");

    if (!deduped.has(key)) {
      deduped.set(key, result);
    }
  }

  return Array.from(deduped.values()).slice(0, MAX_LOCATION_SEARCH_RESULTS);
}

export async function searchPublicCheckLocations(
  query: string,
): Promise<PublicCheckLocationSearchResponse> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return { results: [] };
  }

  const confirmKey = getRequiredJusoApiConfirmKey();
  const searchResponse = await fetchJusoJson({
    url: JUSO_SEARCH_API_URL,
    params: {
      confmKey: confirmKey,
      currentPage: "1",
      countPerPage: String(MAX_LOCATION_SEARCH_RESULTS),
      keyword: trimmedQuery,
      firstSort: "road",
    },
    schema: jusoSearchResponseSchema,
    contextLabel: "Juso 주소 검색",
  });

  const documents = searchResponse.results.juso.slice(
    0,
    MAX_LOCATION_SEARCH_RESULTS,
  );

  if (documents.length === 0) {
    return { results: [] };
  }

  const coordinateResults = await Promise.allSettled(
    documents.map(async (document) => {
      const coordDocument = await fetchJusoCoordinates(document, confirmKey);
      return normalizeJusoResult(document, coordDocument);
    }),
  );

  const results: PublicCheckLocationSearchResult[] = [];
  let firstError: unknown = null;

  for (const result of coordinateResults) {
    if (result.status === "fulfilled") {
      results.push(result.value);
      continue;
    }

    firstError ??= result.reason;
    console.error("Juso 위치 결과 좌표 보강 실패", result.reason);
  }

  if (results.length === 0 && firstError) {
    throw firstError instanceof Error
      ? firstError
      : new ServiceError(502, "Juso 좌표 검색 요청이 실패했습니다.");
  }

  return { results: dedupeLocationResults(results) };
}
