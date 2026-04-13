# 학생관리 spaceId source of truth 정리

## 1차

### 작업내용

- 학생관리에서 선택된 스페이스의 source of truth를 URL `spaceId` 중심으로 정리한다.
- 리로드 직후 스페이스 클릭이 이전 fallback 값에 덮어써지지 않도록 선택 동기화 구조를 수정한다.
- 수강생 추가 진입 링크가 현재 `spaceId`를 유지하도록 수정한다.

### 논의 필요

- 없음

### 선택지

- URL query를 단일 source of truth로 고정하고, query 누락 시에만 보정한다.
- 기존처럼 query + 캐시 + fallback을 혼합 유지하되 예외 케이스만 덧막는다.

### 추천

- URL query를 단일 source of truth로 고정하고, query 누락 시에만 보정한다.

### 사용자 방향
