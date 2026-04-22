# bulk query path 최적화 1차 BACKLOG

작성일: 2026-04-11  
상태: 진행중

---

## 1차: 상담기록 목록 쿼리 slim화

### 작업내용

- 상담기록 list 계열 API가 detail용 대형 컬럼을 함께 읽지 않도록 summary projection으로 분리한다.
- route/service/repository 경계를 정리해 목록 조회가 transcriptText, analysisResult, transcriptionChunks 없이 동작하게 만든다.
- limit/cursor를 받을 수 있는 pagination-ready 시그니처를 추가하되 기존 호출부는 깨지지 않게 유지한다.

### 논의 필요

- 클라이언트 응답 포맷에 pagination metadata를 즉시 노출할지 여부

### 선택지

A. 내부 시그니처만 pagination-ready로 정리하고 응답 스키마는 유지  
B. 응답 schema까지 pagination metadata 포함으로 확장

### 추천

A — 기존 호출부를 깨지 않고 먼저 서버 병목을 줄일 수 있다.

### 사용자 방향

---

## 2차: 멤버 위험도 계산 batch 집계화

### 작업내용

- 수강생 목록 조회 시 member별 상담기록 조회를 반복하지 않도록, memberId 묶음 기준 1회 집계로 위험도/상담 횟수/최근 상담일을 계산한다.
- 상세 조회는 기존 계약을 유지하되 내부 계산 경로를 batch 집계 함수와 공유한다.

### 논의 필요

- 없음

### 선택지

A. 목록 전용 batch 집계 함수 추가  
B. 단건/목록 모두 batch 집계 기반 공통 함수로 통합

### 추천

B — 목록과 상세의 계산 기준을 한 곳으로 맞출 수 있다.

### 사용자 방향

---

## 3차: 배치 import upsert fan-out 축소

### 작업내용

- 시트 import에서 field definition lookup, existing field value lookup, insert/update를 field마다 반복하지 않도록 일괄 preload 및 트랜잭션 upsert로 재구성한다.
- row당 member upsert는 유지하되 field value 쓰기는 member별 batch write로 축소한다.

### 논의 필요

- 없음

### 선택지

A. 기존 upsertFieldValue 재사용  
B. import 전용 bulk upsert 경로 추가

### 추천

B — 대량 import의 병목을 직접 제거할 수 있다.

### 사용자 방향

---

## 4차: 핵심 인덱스 보강

### 작업내용

- counseling_records(created_by_user_id, created_at), (space_id, created_at), (member_id, created_at)
- members(space_id, created_at)
- activity_logs(member_id, space_id, recorded_at)
- member_field_values(member_id, field_definition_id)
  등 고빈도 조회 인덱스를 추가한다.

### 논의 필요

- 운영 DB migration 순서

### 선택지

A. 앱 코드와 스키마만 먼저 반영  
B. 스키마 + migration 생성까지 함께 수행

### 추천

B — 인덱스는 코드 변경 없이 효과가 안 나므로 같이 가야 한다.

### 사용자 방향
