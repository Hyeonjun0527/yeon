## 작업내용

- 3구간(import / OCR)에서 가장 충돌이 적은 1차 리팩터링으로 `integrations/*/(import|analyze)` 라우트의 중복 오케스트레이션을 공통 helper로 정리한다.
- 대상은 우선 `local/import`, `onedrive/import`, `googledrive/import`, `onedrive/analyze`, `googledrive/analyze` 다섯 라우트다.
- 요청/응답 shape, draft 상태 전이, SSE 헤더, 에러 메시지, provider별 인증/다운로드 동작은 유지한다.

## 논의 필요

- `local/analyze`까지 이번 차수에 같이 흡수할지 여부
- 공통 helper 위치를 `app/api/v1/integrations/_shared.ts`에 둘지, `server/services/*`로 올릴지 여부

## 선택지

1. `app/api/v1/integrations/_shared.ts`에 route-level helper를 둔다.
   - 장점: route handler 관심사와 가깝고 NextRequest/NextResponse 문맥 유지가 쉽다.
   - 단점: helper가 커지면 API 레이어 파일이 비대해질 수 있다.
2. `server/services/*`에 orchestration service를 둔다.
   - 장점: 라우트가 더 얇아진다.
   - 단점: HTTP 계층 책임과 server service 책임이 섞일 수 있다.

## 추천

- 이번 차수는 `app/api/v1/integrations/_shared.ts`에 route-level helper를 두는 것이 안전하다.
- 이유: 현재 중복은 request parsing / auth 이후 route orchestration 중복이 핵심이라 HTTP boundary 가까이에서 줄이는 편이 책임이 자연스럽다.
- `local/analyze`는 multipart + fieldHints 분기가 있어서 이번 1차에서는 제외하고, cloud analyze와 import commit 중복만 먼저 정리한다.

## 사용자 방향
