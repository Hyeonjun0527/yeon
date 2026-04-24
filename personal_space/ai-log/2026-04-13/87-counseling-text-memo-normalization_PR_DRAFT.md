## 작업 내용

- 상담 기록에 `record_source`를 추가해 `audio_upload`, `text_memo`, `demo_placeholder`를 명시적으로 구분했습니다.
- 텍스트 메모 생성 시 record row와 transcript segment를 함께 저장하고, 상세 조회에서 정상 열람되게 정리했습니다.
- 텍스트 메모는 목록/상세에는 포함하되, 재생과 재전사만 막도록 service 경계를 분리했습니다.
- 홈 워크스페이스가 텍스트 메모를 일반 상담 기록처럼 선택·표시하고, 오디오 영역만 예외 메시지로 대체하도록 UI를 보강했습니다.
- API contract와 repository/service/home 관련 테스트를 갱신해 텍스트 메모 경로를 고정했습니다.

## 변경 이유

- 텍스트 메모가 `text_memo://` prefix만으로 demo placeholder와 같은 취급을 받아 생성 직후 상세 조회가 깨질 수 있었습니다.
- 최근 코드가 `record_source`를 기대하기 시작한 뒤 로컬 DB에 마이그레이션이 빠지면 `POST /api/v1/counseling-records`가 500으로 실패했습니다.
- source of truth를 storage path prefix 추론에서 명시적 DB 필드로 끌어올려야 텍스트 메모와 데모 데이터를 안전하게 분리할 수 있습니다.

## 검증 방법

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/counseling-records-repository.test.ts src/server/services/__tests__/counseling-records-service.test.ts src/server/services/__tests__/member-risk-service.test.ts src/app/home/_hooks/__tests__/use-records.test.ts src/app/home/_hooks/__tests__/use-record-retry.test.ts src/app/home/_lib/__tests__/failure-presentation.test.ts src/features/student-management/__tests__/report-builder.test.ts`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `fix/counseling-text-memo-normalization-1`
- 순번: `1`
