import { z } from "zod";
import type {
  PublicCheckLocationSearchResponse,
  PublicCheckLocationSearchResult,
} from "@yeon/api-contract";

import { ServiceError } from "./service-error";

const KAKAO_LOCAL_API_BASE_URL = "https://dapi.kakao.com/v2/local/search";
const KAKAO_LOCAL_TIMEOUT_MS = 7000;
const MAX_LOCATION_SEARCH_RESULTS = 6;

const keywordSearchResponseSchema = z.object({
  documents: z.array(
    z.object({
      id: z.string().min(1),
      place_name: z.string().min(1),
      address_name: z.string().min(1).nullable().optional(),
      road_address_name: z.string().min(1).nullable().optional(),
      x: z.string().min(1),
      y: z.string().min(1),
    }),
  ),
});

const addressSearchResponseSchema = z.object({
  documents: z.array(
    z.object({
      address_name: z.string().min(1),
      x: z.string().min(1),
      y: z.string().min(1),
      address: z
        .object({
          address_name: z.string().min(1),
        })
        .nullable()
        .optional(),
      road_address: z
        .object({
          address_name: z.string().min(1),
          building_name: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
});

function getRequiredKakaoRestApiKey() {
  const value = process.env.KAKAO_REST_API_KEY?.trim();

  if (!value) {
    throw new ServiceError(500, "KAKAO_REST_API_KEY가 설정되지 않았습니다.");
  }

  return value;
}

function parseCoordinate(value: string, axis: "위도" | "경도") {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ServiceError(
      502,
      `카카오 위치 검색 응답의 ${axis} 값이 올바르지 않습니다.`,
    );
  }

  return parsed;
}

async function fetchKakaoLocationJson<TSchema>(options: {
  path: string;
  query: string;
  schema: z.ZodType<TSchema>;
  contextLabel: string;
  apiKey: string;
}) {
  const url = new URL(`${KAKAO_LOCAL_API_BASE_URL}/${options.path}`);

  url.searchParams.set("query", options.query);
  url.searchParams.set("size", String(MAX_LOCATION_SEARCH_RESULTS));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${options.apiKey}`,
      },
      signal: AbortSignal.timeout(KAKAO_LOCAL_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`${options.contextLabel}: 카카오 위치 검색 요청 실패`, error);
    throw new ServiceError(502, "카카오 위치 검색 요청이 실패했습니다.");
  }

  const rawBody = await response.text();
  let parsedBody: unknown = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      console.error(`${options.contextLabel}: JSON 파싱 실패`, rawBody);
      throw new ServiceError(
        502,
        "카카오 위치 검색 응답을 해석하지 못했습니다.",
      );
    }
  }

  if (!response.ok) {
    console.error(`${options.contextLabel}: 카카오 위치 검색 응답 오류`, {
      status: response.status,
      body: parsedBody ?? rawBody,
    });
    throw new ServiceError(502, "카카오 위치 검색 요청이 실패했습니다.");
  }

  const parsed = options.schema.safeParse(parsedBody);

  if (!parsed.success) {
    console.error(`${options.contextLabel}: 응답 스키마 불일치`, {
      issues: parsed.error.issues,
      body: parsedBody,
    });
    throw new ServiceError(
      502,
      "카카오 위치 검색 응답 형식이 올바르지 않습니다.",
    );
  }

  return parsed.data;
}

function buildKeywordLabel(
  document: z.infer<typeof keywordSearchResponseSchema>["documents"][number],
) {
  const roadAddress = document.road_address_name?.trim() || null;
  const address = document.address_name?.trim() || null;

  if (roadAddress) {
    return `${document.place_name} · ${roadAddress}`;
  }

  if (address) {
    return `${document.place_name} · ${address}`;
  }

  return document.place_name;
}

function normalizeKeywordResult(
  document: z.infer<typeof keywordSearchResponseSchema>["documents"][number],
): PublicCheckLocationSearchResult {
  return {
    id: `keyword:${document.id}`,
    label: buildKeywordLabel(document),
    placeName: document.place_name,
    roadAddressName: document.road_address_name?.trim() || null,
    addressName: document.address_name?.trim() || null,
    longitude: parseCoordinate(document.x, "경도"),
    latitude: parseCoordinate(document.y, "위도"),
    source: "keyword",
  };
}

function buildAddressLabel(
  document: z.infer<typeof addressSearchResponseSchema>["documents"][number],
) {
  const roadAddress = document.road_address?.address_name?.trim() || null;
  const buildingName = document.road_address?.building_name?.trim() || null;

  if (buildingName && roadAddress) {
    return `${buildingName} · ${roadAddress}`;
  }

  return roadAddress ?? document.address_name;
}

function normalizeAddressResult(
  document: z.infer<typeof addressSearchResponseSchema>["documents"][number],
): PublicCheckLocationSearchResult {
  return {
    id: `address:${document.address_name}:${document.x}:${document.y}`,
    label: buildAddressLabel(document),
    placeName: document.road_address?.building_name?.trim() || null,
    roadAddressName: document.road_address?.address_name?.trim() || null,
    addressName:
      document.address?.address_name?.trim() || document.address_name.trim(),
    longitude: parseCoordinate(document.x, "경도"),
    latitude: parseCoordinate(document.y, "위도"),
    source: "address",
  };
}

function dedupeLocationResults(results: PublicCheckLocationSearchResult[]) {
  const deduped = new Map<string, PublicCheckLocationSearchResult>();

  for (const result of results) {
    const key = [
      result.latitude.toFixed(6),
      result.longitude.toFixed(6),
      result.roadAddressName ?? "",
      result.addressName ?? "",
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

  const apiKey = getRequiredKakaoRestApiKey();

  const [keywordResponse, addressResponse] = await Promise.all([
    fetchKakaoLocationJson({
      path: "keyword.json",
      query: trimmedQuery,
      schema: keywordSearchResponseSchema,
      contextLabel: "카카오 키워드 위치 검색",
      apiKey,
    }),
    fetchKakaoLocationJson({
      path: "address.json",
      query: trimmedQuery,
      schema: addressSearchResponseSchema,
      contextLabel: "카카오 주소 위치 검색",
      apiKey,
    }),
  ]);

  const keywordResults = keywordResponse.documents.map(normalizeKeywordResult);
  const addressResults = addressResponse.documents.map(normalizeAddressResult);

  return {
    results: dedupeLocationResults([...keywordResults, ...addressResults]),
  };
}
