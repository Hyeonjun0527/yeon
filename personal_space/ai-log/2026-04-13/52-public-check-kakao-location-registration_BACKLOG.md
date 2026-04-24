# 공개 체크인 위치 검색 전환 백로그

## 1차

- 작업내용
  - 공개 체크인 세션 위치 등록을 수동 좌표 입력에서 Kakao Local 기반 주소/건물명 검색 선택 UX로 전환한다.
  - 검색 결과 선택 시 내부적으로 `locationLabel`, `latitude`, `longitude`, `radiusMeters`를 채워 기존 반경 검증을 유지한다.
  - 기본 반경 `150m`, 조정 범위 `50~300m`를 반영한다.
  - 서버 검색 엔드포인트와 테스트를 추가한다.
- 논의 필요
  - 주소 검색 결과를 keyword + address 혼합으로 정규화할 때 표시 우선순위를 어떻게 둘지
  - Kakao API 환경변수 누락 시 운영자에게 어떤 오류 문구를 보여줄지
- 선택지
  - A. 클라이언트에서 Kakao SDK 직접 호출
  - B. 서버 route handler를 통해 Kakao Local REST API 호출 후 정규화
- 추천
  - B. API 키를 서버에 숨기고, 기존 `packages/api-contract`와 인증 경계 안에서 검색 결과를 제어하는 편이 안전하다.
- 사용자 방향
  - Kakao Local API 사용
  - 운영자는 도로명 주소/건물명 검색 결과로 위치 선택
  - 검증은 기존 GPS 반경 비교 유지
  - 기본 반경 150m, 조정 범위 50~300m
