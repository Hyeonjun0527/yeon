# Draft: import-analysis-reload-recovery

## Requirements (confirmed)

- 사용자 관점에서 파일 분석 중/후 새로고침 시 작업이 사라지지 않아야 한다.
- 단순 구현 논의가 아니라 사용자 신뢰/작업 연속성 문제로 다뤄야 한다.
- 대상 흐름은 스프레드시트 파일 분석 → 미리보기/수정 → 가져오기(import) 전 단계다.

## Technical Decisions

- 현재 1차 추천 방향은 서버 중심 `import draft session` 도입이다.
- TanStack Query 캐시 유지나 메모리 상태만으로는 신뢰 문제를 해결하지 못한다.
- 로컬 저장은 보조 안전망으로만 사용하고, source of truth는 서버 draft로 둔다.

## Research Findings

- `apps/web/src/features/cloud-import/hooks/use-cloud-import.ts`, `use-local-import.ts`에서 분석 결과가 `useState`에만 존재한다.
- `apps/web/src/features/cloud-import/components/import-right-panel.tsx`가 분석 중/완료 UI를 렌더링한다.
- `apps/web/src/server/services/import-stream.ts`는 진행 상태를 SSE로 스트리밍만 하고 저장하지 않는다.
- `apps/web/src/server/services/file-analysis-service.ts`는 분석 결과를 생성하지만 DB/스토리지에 저장하지 않는다.
- `apps/web/src/server/services/import-preview-service.ts`는 최종 import된 데이터만 저장한다.

## Open Questions

- local 파일도 서버에 임시 업로드/보관해 새로고침 후 완전 복구 대상으로 포함할지?
- draft 보관 기간(예: 24시간/7일)과 개인정보 보관 정책을 어디까지 허용할지?

## Scope Boundaries

- INCLUDE: 분석 진행/완료/편집 상태의 reload-safe 복구 전략
- EXCLUDE: 최종 import 이후 운영 화면 전반의 상태 복구, unrelated cloud browser cache 개선
