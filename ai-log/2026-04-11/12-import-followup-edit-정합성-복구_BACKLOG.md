# Import follow-up edit 정합성 복구 백로그

## 차수 1

### 작업내용

- `apps/web/src/server/services/file-analysis-service.ts`의 구조화 스프레드시트 refine 경로가 사용자 후속 수정 요청을 실제 preview에 반영하도록 보정한다.
- `apps/web/src/server/services/import-stream.ts`에서 draft 저장이 끝나기 전에 SSE 성공을 먼저 내보내는 경쟁 상태를 제거한다.
- `apps/web/src/features/cloud-import/hooks/import-helpers.ts`의 성공 문구를 실제 변경 유무 기준으로 재작성해, 변경이 없을 때 업데이트 완료로 오인하지 않게 만든다.
- 관련 단위 테스트를 추가해 rename/remove column 같은 후속 수정 요청과 저장 완료 순서를 회귀 방지한다.

### 논의 필요

- 사용자가 `email` 같은 고정 필드를 임의 컬럼명으로 바꾸라고 요청한 경우, canonical 필드를 유지할지 custom field로 이동할지 정책을 더 명확히 정할 필요가 있다.
- 후속 수정 요청 실패 시 현재처럼 채팅 한 줄 오류만 보여줄지, preview 상단에 별도 저장 실패 배너를 둘지 UX 검토가 필요하다.

### 선택지

1. 구조화 스프레드시트 refine도 기존처럼 프로그래밍 추출만 유지하고, 문구만 보수적으로 바꾼다.
2. 구조화 스프레드시트 refine는 현재 preview를 source of truth로 두고 AI 보정 단계를 추가해 실제 수정 요청을 반영하게 만든다.

### 추천

- 선택지 2
- 현재 문제는 단순 문구 오류가 아니라 source of truth와 사용자 응답이 어긋난 상태 정합성 문제다. refine 요청을 실제 preview 변환 단계로 연결하고, 저장 완료 이후에만 성공 응답을 내보내야 사용자가 본 것과 저장된 결과가 일치한다.

### 사용자 방향
