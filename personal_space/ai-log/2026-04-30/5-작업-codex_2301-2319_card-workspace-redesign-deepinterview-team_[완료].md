# 작업-codex | card-workspace-redesign-deepinterview-team

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: main
- 작업창(예상): 23:01 ~ 23:59
- 실제 시작: 23:01
- 실제 종료: 23:19
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)
- apps/web/src/features/card-service/**
- apps/web/src/app/card-service/**
- 관련 테스트/작업 로그/.omx context/spec/team state

## 절대 건드리지 않을 범위 (상대 주체 담당)
- card-service 개편과 무관한 기능 파일은 변경 금지
- 이전 작업 중인 변경은 되돌리지 않음

## 상대 주체 현황 스냅샷
- 기존 broad changes 다수 존재. 직접 관련 파일만 최소 수정 예정.

## 차수별 작업내용
1. deck detail brownfield context 확인
2. deep-interview로 first-pass 범위 확정
3. 확정 spec 작성
4. OMX team 실행 및 검증

## 23:10 ~ 23:19 실행 결과
- deep-interview 사용자 답변 `include-right-edit` 반영: 카드 row 선택 시 오른쪽 편집 패널/모바일 편집 시트로 진입하도록 설계 확정.
- 데스크톱 덱 상세를 2열 워크스페이스로 개편:
  - 왼쪽: 덱 요약 + 학습 시작 CTA + compact 카드 목록
  - 오른쪽: sticky 카드 추가/편집 패널
- 모바일 UX 반영:
  - 본문은 덱 요약 + 카드 목록 중심
  - `+` FAB 클릭 시 카드 추가 바텀시트 노출
  - 카드 row 클릭 시 같은 바텀시트에서 편집
  - 왼쪽 swipe 시 삭제 버튼 reveal, 더보기 메뉴에서도 2-step 삭제 가능
- 카드 목록 row 기본 표시를 질문/답변 preview로 compact화. 줄바꿈은 목록 preview에서는 공백으로 접고, 펼침/편집에서는 원문 줄바꿈 유지.
- 새 카드 추가 기본 탭은 기존 명시 요청대로 `AI 형식 붙여넣기` 유지.
- OMX team:
  - `review-and-implement-plan-the` 런타임 사용.
  - worker-2/3/4에 read-only review/verification task 배정 후 완료 보고 수신.
  - worker-1 초기 task 2개는 readiness timeout으로 실패 처리 후 `--confirm-issues`로 shutdown 완료.

## 검증
- `pnpm exec prettier --write apps/web/src/features/card-service/deck-detail-screen.tsx apps/web/src/features/card-service/components/deck-detail-header.tsx apps/web/src/features/card-service/components/card-row.tsx apps/web/src/features/card-service/components/add-card-form.tsx apps/web/src/features/card-service/components/add-cards-panel.tsx` 통과
- `pnpm --filter @yeon/web lint` 통과
- `pnpm --filter @yeon/web typecheck` 통과
- `pnpm --filter @yeon/web exec vitest run src/features/card-service/utils/bulk-card-import-parser.test.ts` 통과 (1 file, 8 tests)
- `git diff --check` 통과
- `pnpm --filter @yeon/web build` 통과
