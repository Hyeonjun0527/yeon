# 작업-codex | Life OS risk closure + critical code review Ralph

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: main
- 작업창(예상): 21:53 ~ 23:00
- 실제 시작: 21:53
- 실제 종료: _(작업중)_
- 상태: 작업중

## 파일·디렉토리 범위 (whitelist)

- apps/web/src/app/api/v1/life-os/**
- apps/web/src/app/api/v1/counseling-records/_shared.ts (auth helper 개선 필요 시)
- apps/web/src/server/services/life-os-service.ts
- apps/web/src/server/db/schema/life-os.ts
- apps/web/src/server/db/migrations/**
- apps/web/src/features/life-os/**
- apps/mobile/app/(tabs)/life-os.tsx
- apps/mobile/app/(tabs)/_layout.tsx
- apps/mobile/src/features/life-os/**
- apps/mobile/src/services/life-os/**
- packages/domain/src/life-os.ts
- packages/api-contract/src/life-os.ts
- packages/api-client/src/index.ts
- package manifests / pnpm-lock.yaml

## 절대 건드리지 않을 범위 (상대 주체 담당)

- Life OS와 무관한 기존 서비스 코드 의미 변경 금지
- AGENTS/CLAUDE governance 변경 금지
- commit/push/PR 금지(사용자 commit/ship 명령 전까지)

## 상대 주체 현황 스냅샷

- main...origin/main [ahead 4]
- 이전 team state 없음 확인 필요
- Life OS 관련 diff 및 personal_space logs 존재

## 차수별 작업내용

1. code-review SSOT 읽고 실제 critical 전수 탐색
2. 모바일 출시 리스크(auth/persistence) 해결
3. 발견 critical 모두 수정
4. lint/typecheck/test/build/db drift/mobile 검증
5. architect/deslop 관점 최종 점검 후 완료 로그 rename


## 완료 요약

- 실제 종료: 22:14
- 상태: 완료
- OMX team `read-only-review-and-implement`를 read-only 검토 용도로 실행하고, worker 결과를 통합한 뒤 shutdown 완료.
- `$code-review` 기준으로 가짜 critical을 만들지 않고 실제 릴리즈 차단급 이슈만 선별.
- 발견한 실제 critical/release-blocker 6개를 수정 완료.
  1. Life OS 모바일이 로컬 상태만 사용해 앱 재시작/기기 간 동기화가 불가능한 문제 → SecureStore 세션 + 공용 API query/mutation으로 전환.
  2. Life OS API가 cookie 세션만 받아 Expo 앱에서 인증 불가한 문제 → Authorization Bearer 세션 토큰 지원 + api-client token 옵션 추가.
  3. 모바일 Life OS 날짜가 UTC 기준으로 밀릴 수 있는 문제 → Asia/Seoul local date formatter로 고정.
  4. Life OS upsert가 read-then-write라 동시 최초 저장 시 unique 충돌 가능 → DB `onConflictDoUpdate` atomic upsert 적용.
  5. 웹 Life OS가 날짜 전환/로딩 중 빈 draft를 저장해 기존 기록을 덮을 수 있는 문제 → 로딩/저장 중 입력·저장 비활성화.
  6. 모바일 릴리즈 빌드가 `localhost:3000` API fallback으로 기기에서 서버 접근 불가한 문제 → production runtime에서 public HTTPS `EXPO_PUBLIC_API_BASE_URL` 필수화.
- 카드 서비스 UX 반영:
  - 카드 row의 별도 편집 버튼 제거, 카드 클릭/Enter/Space로 즉시 편집.
  - 모바일 터치에서 왼쪽 swipe는 삭제를 실행하지 않고 삭제 rail/div만 노출.
  - 데스크톱 hover/focus에서도 우측 삭제 rail이 노출되도록 보완.
  - flashcard view/list에 `break-keep`을 추가해 한글이 어색하게 쪼개지는 자동 줄바꿈을 완화.

## 검증

- PASS `pnpm --filter @yeon/domain typecheck`
- PASS `pnpm --filter @yeon/api-contract typecheck`
- PASS `pnpm --filter @yeon/api-client typecheck`
- PASS `pnpm --filter @yeon/web typecheck`
- PASS `pnpm --filter @yeon/mobile typecheck`
- PASS `pnpm --filter @yeon/web lint`
- PASS `pnpm --filter @yeon/mobile lint`
- PASS `pnpm --filter @yeon/api-contract lint`
- PASS `pnpm --filter @yeon/api-client lint`
- PASS `pnpm --filter @yeon/domain exec vitest run src/life-os.test.ts`
- PASS `pnpm --filter @yeon/api-contract exec vitest run src/__tests__/life-os.test.ts`
- PASS `pnpm --filter @yeon/web exec vitest run src/features/life-os/utils.test.ts`
- PASS `pnpm --filter @yeon/web db:check:drift`
- PASS `pnpm --filter @yeon/web build`
- PASS `pnpm exec prettier --check ...`
- PASS `git diff --check`

## 남은 리스크

- Expo 앱에 별도 card-service native 화면은 아직 없어서, 이번 swipe delete는 웹 card-service의 모바일 터치 UX에 적용됨.
- 실제 기기/브라우저 수동 터치 검증은 아직 미실행.
- 커밋/PR은 사용자 명시 `commit`/`ship` 전까지 수행하지 않음.
