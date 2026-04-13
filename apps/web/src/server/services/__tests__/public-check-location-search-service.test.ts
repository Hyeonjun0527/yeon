import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchPublicCheckLocations } from "../public-check-location-search-service";

describe("public-check-location-search-service", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JUSO_API_CONFIRM_KEY = "juso-test-key";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("검색어가 짧으면 Juso API를 호출하지 않고 빈 결과를 반환한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(searchPublicCheckLocations("강")).resolves.toEqual({
      results: [],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("Juso 검색 결과를 좌표까지 보강해 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (input) => {
        const requestUrl = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url,
        );

        if (requestUrl.pathname.endsWith("/addrLinkApi.do")) {
          return new Response(
            JSON.stringify({
              results: {
                common: {
                  countPerPage: "6",
                  currentPage: "1",
                  errorCode: "0",
                  errorMessage: "정상",
                  totalCount: "2",
                },
                juso: [
                  {
                    roadAddr: "서울특별시 서초구 강남대로12길 8 (양재동)",
                    roadAddrPart1: "서울특별시 서초구 강남대로12길 8",
                    roadAddrPart2: " (양재동)",
                    jibunAddr: "서울특별시 서초구 양재동 326-2 성경빌딩",
                    admCd: "1165010200",
                    rnMgtSn: "116504163008",
                    bdMgtSn: "1165010200103260002004362",
                    detBdNmList: "",
                    bdNm: "성경빌딩",
                    udrtYn: "0",
                    buldMnnm: "8",
                    buldSlno: "0",
                  },
                  {
                    roadAddr: "서울특별시 중구 세종대로 110",
                    roadAddrPart1: "서울특별시 중구 세종대로 110",
                    roadAddrPart2: "",
                    jibunAddr: "서울특별시 중구 태평로1가 31",
                    admCd: "1114010300",
                    rnMgtSn: "111404103001",
                    bdMgtSn: "1114010300100310000000001",
                    detBdNmList: "",
                    bdNm: "",
                    udrtYn: "0",
                    buldMnnm: "110",
                    buldSlno: "0",
                  },
                ],
              },
            }),
            { status: 200 },
          );
        }

        if (requestUrl.pathname.endsWith("/addrCoordApi.do")) {
          const buildingNumber =
            requestUrl.searchParams.get("buldMnnm") ?? "unknown";

          if (buildingNumber === "8") {
            return new Response(
              JSON.stringify({
                results: {
                  common: {
                    countPerPage: "10",
                    currentPage: "1",
                    errorCode: "0",
                    errorMessage: "정상",
                    totalCount: "1",
                  },
                  juso: [
                    {
                      admCd: "1165010200",
                      rnMgtSn: "116504163008",
                      bdMgtSn: "1165010200103260002004362",
                      udrtYn: "0",
                      buldMnnm: "8",
                      buldSlno: "0",
                      entX: "945959.0381341814",
                      entY: "1953851.7348996028",
                      bdNm: "성경빌딩",
                    },
                  ],
                },
              }),
              { status: 200 },
            );
          }

          return new Response(
            JSON.stringify({
              results: {
                common: {
                  countPerPage: "10",
                  currentPage: "1",
                  errorCode: "0",
                  errorMessage: "정상",
                  totalCount: "1",
                },
                juso: [
                  {
                    admCd: "1114010300",
                    rnMgtSn: "111404103001",
                    bdMgtSn: "1114010300100310000000001",
                    udrtYn: "0",
                    buldMnnm: "110",
                    buldSlno: "0",
                    entX: "953901.1655108433",
                    entY: "1952032.0805220276",
                    bdNm: "",
                  },
                ],
              },
            }),
            { status: 200 },
          );
        }

        throw new Error(`예상하지 못한 요청입니다: ${requestUrl.pathname}`);
      }),
    );

    const result = await searchPublicCheckLocations("강남대로12길");

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({
      id: "juso:1165010200103260002004362",
      label: "성경빌딩 · 서울특별시 서초구 강남대로12길 8",
      placeName: "성경빌딩",
      roadAddressName: "서울특별시 서초구 강남대로12길 8 (양재동)",
      addressName: "서울특별시 서초구 양재동 326-2 성경빌딩",
      source: "keyword",
    });
    expect(result.results[0]?.latitude).toBeCloseTo(37.58246873158715, 6);
    expect(result.results[0]?.longitude).toBeCloseTo(126.88793748501445, 6);

    expect(result.results[1]).toMatchObject({
      id: "juso:1114010300100310000000001",
      label: "서울특별시 중구 세종대로 110",
      placeName: null,
      roadAddressName: "서울특별시 중구 세종대로 110",
      addressName: "서울특별시 중구 태평로1가 31",
      source: "address",
    });
    expect(result.results[1]?.latitude).toBeCloseTo(37.56649999589038, 6);
    expect(result.results[1]?.longitude).toBeCloseTo(126.97800000227855, 6);
  });

  it("Juso 승인키가 없으면 500 오류를 던진다", async () => {
    delete process.env.JUSO_API_CONFIRM_KEY;

    await expect(searchPublicCheckLocations("판교역")).rejects.toMatchObject({
      status: 500,
      message: "JUSO_API_CONFIRM_KEY가 설정되지 않았습니다.",
    });
  });

  it("Juso 승인키가 유효하지 않으면 설정 안내 오류를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              common: {
                countPerPage: "6",
                currentPage: "1",
                errorCode: "E0001",
                errorMessage: "승인되지 않은 KEY 입니다.",
                totalCount: "0",
              },
              juso: null,
            },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      searchPublicCheckLocations("건원대로 34번길 51"),
    ).rejects.toMatchObject({
      status: 500,
      message: "JUSO_API_CONFIRM_KEY 설정 또는 승인키 권한을 확인해 주세요.",
    });
  });
});
