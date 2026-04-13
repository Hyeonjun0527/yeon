import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchPublicCheckLocations } from "../public-check-location-search-service";

describe("public-check-location-search-service", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.KAKAO_REST_API_KEY = "kakao-test-key";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("검색어가 짧으면 카카오 API를 호출하지 않고 빈 결과를 반환한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(searchPublicCheckLocations("강")).resolves.toEqual({
      results: [],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("키워드 검색과 주소 검색 결과를 합쳐 중복 없이 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              documents: [
                {
                  id: "place-1",
                  place_name: "카카오 판교아지트",
                  address_name: "경기 성남시 분당구 백현동 532",
                  road_address_name: "경기 성남시 분당구 판교역로 166",
                  x: "127.112000",
                  y: "37.395000",
                },
              ],
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              documents: [
                {
                  address_name: "경기 성남시 분당구 판교역로 166",
                  x: "127.112000",
                  y: "37.395000",
                  address: {
                    address_name: "경기 성남시 분당구 백현동 532",
                  },
                  road_address: {
                    address_name: "경기 성남시 분당구 판교역로 166",
                    building_name: "카카오 판교아지트",
                  },
                },
                {
                  address_name: "서울 강남구 테헤란로 427",
                  x: "127.056000",
                  y: "37.504000",
                  address: {
                    address_name: "서울 강남구 삼성동 142-43",
                  },
                  road_address: {
                    address_name: "서울 강남구 테헤란로 427",
                    building_name: "위워크타워",
                  },
                },
              ],
            }),
            { status: 200 },
          ),
        ),
    );

    await expect(searchPublicCheckLocations("판교 카카오")).resolves.toEqual({
      results: [
        {
          id: "keyword:place-1",
          label: "카카오 판교아지트 · 경기 성남시 분당구 판교역로 166",
          placeName: "카카오 판교아지트",
          roadAddressName: "경기 성남시 분당구 판교역로 166",
          addressName: "경기 성남시 분당구 백현동 532",
          longitude: 127.112,
          latitude: 37.395,
          source: "keyword",
        },
        {
          id: "address:서울 강남구 테헤란로 427:127.056000:37.504000",
          label: "위워크타워 · 서울 강남구 테헤란로 427",
          placeName: "위워크타워",
          roadAddressName: "서울 강남구 테헤란로 427",
          addressName: "서울 강남구 삼성동 142-43",
          longitude: 127.056,
          latitude: 37.504,
          source: "address",
        },
      ],
    });
  });

  it("카카오 REST API 키가 없으면 500 오류를 던진다", async () => {
    delete process.env.KAKAO_REST_API_KEY;

    await expect(searchPublicCheckLocations("판교역")).rejects.toMatchObject({
      status: 500,
      message: "KAKAO_REST_API_KEY가 설정되지 않았습니다.",
    });
  });

  it("OPEN_MAP_AND_LOCAL 서비스가 비활성화돼 있으면 설정 안내 오류를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            errorType: "NotAuthorizedError",
            message: "App(YEON) disabled OPEN_MAP_AND_LOCAL service.",
          }),
          { status: 401 },
        );
      }),
    );

    await expect(
      searchPublicCheckLocations("건원대로 34번길 51"),
    ).rejects.toMatchObject({
      status: 500,
      message:
        "Kakao Developers에서 OPEN_MAP_AND_LOCAL 서비스를 활성화해야 위치 검색을 사용할 수 있습니다.",
    });
  });
});
