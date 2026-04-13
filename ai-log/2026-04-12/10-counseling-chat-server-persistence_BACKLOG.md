# 10. 상담 AI 채팅 서버 저장 정식 구현

## 목표

상담 기록 워크스페이스와 `/home` 패널의 AI 채팅을 브라우저 메모리 상태가 아니라 **서버/DB 기준으로 저장**한다.

- 새로고침/재진입 후에도 채팅이 유지되어야 한다.
- `채팅 기록` 탭은 실제 저장된 대화를 보여줘야 한다.
- AI 응답 생성과 저장 시점이 분리되지 않도록, 사용자 메시지/어시스턴트 메시지 모두 같은 source of truth에 적재한다.

---

## 차수 1

### 작업내용

- `packages/api-contract/src/counseling-records.ts`에 상담 채팅 메시지/기록 스키마를 추가한다.
- `apps/web/src/server/db/schema/counseling-records.ts`에 채팅 저장용 컬럼을 추가한다.
- `apps/web/src/server/db/migrations/*.sql`에 대응 migration을 추가한다.

### 논의 필요

- 별도 테이블(`conversation_messages`)로 분리할지, 우선 `counseling_records`의 `jsonb` 컬럼으로 둘지 결정 필요.

### 선택지

- A. 별도 메시지 테이블
- B. `counseling_records.chat_messages jsonb`

### 추천

- B. 현재 대화는 상담 기록 단위로 1개의 스레드에 종속되어 있고, 기존 목록/상세 API도 record 중심이라 `jsonb` 컬럼이 최소 변경으로 안전하다.

### 사용자 방향

---

## 차수 2

### 작업내용

- `apps/web/src/server/services/counseling-records-repository.ts`에 채팅 메시지 파싱/정규화 헬퍼와 읽기·쓰기 함수를 추가한다.
- `apps/web/src/server/services/counseling-records-service.ts`에 채팅 이력 조회/초기화/append 저장 함수를 추가한다.
- 기존 상세 조회(`getCounselingRecordDetail`)가 저장된 채팅을 함께 반환하도록 연결한다.

### 논의 필요

- 초기 웰컴 메시지를 DB에 영구 저장할지, UI 파생값으로만 둘지 결정 필요.

### 선택지

- A. 웰컴 메시지도 저장
- B. 사용자/AI 실대화만 저장, 웰컴은 UI 파생

### 추천

- B. 고정 안내 문구는 데이터가 아니라 프레젠테이션에 가깝다. 실제 질의/응답만 저장해야 기록 탭이 깔끔하고 마이그레이션도 단순하다.

### 사용자 방향

---

## 차수 3

### 작업내용

- `apps/web/src/app/api/v1/counseling-records/[recordId]/chat/route.ts`를 저장-aware API로 바꾼다.
- 요청을 받은 즉시 사용자 메시지를 저장한다.
- 스트리밍 응답을 누적한 뒤 완료 시 최종 assistant 메시지를 저장한다.
- 필요한 경우 `GET`/`DELETE`를 추가해 채팅 이력 조회와 새 채팅 시작을 서버 기준으로 처리한다.

### 논의 필요

- 스트리밍 중간 청크까지 저장할지, 완료 시 최종 메시지만 저장할지 결정 필요.

### 선택지

- A. 청크 단위 저장
- B. 완료 시 최종 assistant 메시지 1회 저장

### 추천

- B. 부분 저장은 race/stale 상태를 늘린다. 실패 시에는 사용자 메시지만 남고 assistant는 오류 메시지를 별도 추가하거나 저장하지 않는 편이 정합성이 높다.

### 사용자 방향

---

## 차수 4

### 작업내용

- `apps/web/src/features/counseling-record-workspace/hooks/use-assistant-chat.ts`가 서버 저장 채팅을 detail 기반으로 hydrate 하도록 수정한다.
- `apps/web/src/app/home/_hooks/use-records.ts`, `use-ai-chat.ts`, `ai-panel.tsx`도 서버 응답 기반으로 동기화한다.
- `ChatHistoryTab`를 실제 저장 메시지/기록 리스트로 교체하고, 새 채팅 버튼은 서버 초기화와 연결한다.

### 논의 필요

- `/home` 패널과 상담 워크스페이스가 같은 저장 포맷을 공유할지 확인 필요.

### 선택지

- A. 화면별 별도 포맷 유지
- B. 공용 contract 기반 포맷 통일

### 추천

- B. 같은 record chat를 서로 다른 화면에서 다루므로 contract를 통일해야 상태 오염을 막을 수 있다.

### 사용자 방향

---

## 차수 5

### 작업내용

- 변경 파일 LSP 진단을 확인한다.
- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web build`
- 가능 범위에서 관련 테스트 또는 회귀 확인을 수행한다.

### 논의 필요

- 로컬 DB/migration 적용 환경이 없으면 schema와 SQL의 정합성은 코드 수준 검증까지만 가능할 수 있다.

### 선택지

- A. 코드/타입/빌드 검증만 우선
- B. 로컬 DB까지 올려 migration 실제 적용 검증

### 추천

- A를 기본으로 하되, 환경이 준비돼 있으면 B까지 확장한다.

### 사용자 방향
