# 작업-codex | AI 형식 카드 일괄 추가 개발 및 main 운영 반영

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: feat/bulk-card-import-main-1
- 작업창(예상): 15:56 ~ 17:30
- 실제 시작: 15:56
- 실제 종료: 16:20
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)
- packages/api-contract/src/card-decks.ts
- apps/web/src/features/card-service/**
- apps/web/src/app/api/v1/card-decks/**
- apps/web/src/server/services/card-decks-service.ts
- apps/web/src/lib/guest-card-service-store.ts
- 관련 테스트/PR 문서

## 절대 건드리지 않을 범위 (상대 주체 담당)
- 상담 기록/학생관리/타자연습 등 카드 서비스와 무관한 기능 파일
- 운영 DB 직접 수정 없음

## 상대 주체 현황 스냅샷
- 현재 worktree A는 develop checkout 상태에서 시작.
- 사용자가 develop 잠정중지/main-only 운영을 명시하여 이번 작업은 origin/main 기준 feature branch → main PR/merge로 진행.
- personal_space/ai-log/2026-04-30/ 기존 auth debug/repair 로그 2건 존재.

## 차수별 작업내용
1. main 기준 작업 브랜치 생성 및 현재 카드 서비스 구조 확인.
2. AI 붙여넣기 형식 파서/계약/API/guest store/hook/UI 구현.
3. parser 및 핵심 흐름 검증, lint/typecheck/build.
4. 커밋, push, main PR 생성/머지로 운영 반영.


## 구현 결과
- 기존 앞면/뒷면 직접 입력은 유지하고, 카드 상세 화면에 `직접 입력` / `AI 형식 붙여넣기` 탭을 추가.
- AI 붙여넣기 형식: `[[Q]]`, `[[A]]`, `[[CARD]]` 마커 기반으로 여러 카드를 한 번에 생성.
- `[[Q]]문제`, `[[A]]정답` 같은 인라인 마커와 여러 줄 본문을 지원.
- 본문 안의 일반 `[]` 사용은 파싱에 영향 없음.
- 본문 줄이 마커와 완전히 같은 형태여야 할 때는 `\[[Q]]`, `\[[A]]`, `\[[CARD]]`로 escape 가능.
- 로그인 사용자용 bulk API와 게스트 IndexedDB bulk 저장을 모두 추가.

## 검증
- `pnpm --filter @yeon/web exec vitest run src/features/card-service/utils/bulk-card-import-parser.test.ts` 통과 (7 tests).
- `pnpm --filter @yeon/web lint` 통과.
- `pnpm --filter @yeon/web typecheck` 통과.
- `pnpm --filter @yeon/api-contract typecheck` 통과.
- `pnpm --filter @yeon/web build` 통과, 신규 route `/api/v1/card-decks/[deckId]/items/bulk` 빌드 확인.
- pre-commit hook의 SSOT/sync/lint/typecheck 통과.

## 배포
- 브랜치: `feat/bulk-card-import-main-1`
- 커밋: `4328194` (`AI가 만든 카드 묶음을 바로 저장할 수 있게 한다`)
- PR: https://github.com/Hyeonjun0527/yeon/pull/162
- main merge commit: `8c0e8198f030049312655e559e985ccd35b02be4`
- GitHub Actions 운영 배포 run: https://github.com/Hyeonjun0527/yeon/actions/runs/25152330139
- 운영 배포 결과: success (`deploy_production` success, `deploy_develop` skipped)
- 운영 확인:
  - `curl https://yeon.world` → HTTP 200
  - `curl https://yeon.world/api/health` → HTTP 200 / `{"status":"ok","service":"web"}`
  - `POST https://yeon.world/api/v1/card-decks/test/items/bulk` → HTTP 401 `로그인이 필요합니다.` (route 존재 + auth guard 확인)

## 훅 127 조치
- 원인: 현재 repo에서 PostToolUse 훅이 호출하는 `.codex/hooks/dispatch.sh` 경로가 없어서 shell exit code 127(command not found)가 발생.
- 조치: `.codex/hooks`를 설치된 OMX hook 디렉터리로 symlink하여 `dispatch.sh` 실행 가능 상태로 복구.
- 검증: `bash .codex/hooks/dispatch.sh PostToolUse` exit 0.

## 남은 리스크
- 운영 UI에서 실제 로그인 후 카드 생성까지의 브라우저 E2E는 별도 계정 세션이 필요해 미수행.
- `.codex/hooks` symlink와 작업 로그는 로컬 운영 산출물이라 커밋하지 않음.
