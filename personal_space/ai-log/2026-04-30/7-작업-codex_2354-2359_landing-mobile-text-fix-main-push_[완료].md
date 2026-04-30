# 작업-codex | 랜딩 모바일 줄바꿈 수정 + main 반영 준비

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: main (작업 누적 후 main 대상 PR 브랜치 생성 예정)
- 작업창(예상): 23:54 ~ 00:30
- 실제 시작: 23:54
- 실제 종료: 23:59
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)
- apps/web/src/features/landing-home/landing-home.tsx
- output/playwright/yeon-world-mobile-home*.png
- personal_space/ai-log/2026-04-30/
- 기존 누적 변경사항 검증/커밋/PR 관련 파일

## 절대 건드리지 않을 범위 (상대 주체 담당)
- 다른 에이전트가 작업한 기존 변경을 임의 revert하지 않음
- .codex/hooks 외부 symlink는 커밋 대상에서 제외

## 상대 주체 현황 스냅샷
- 이전 OMX team 검증은 완료/종료됨.
- 현재 working tree에는 Life OS, 카드 서비스 웹/모바일, 인증/API 계약 변경이 누적되어 있음.

## 차수별 작업내용

### 1차: production 모바일 화면 직접 확인
- Playwright Chromium 모바일 viewport(390x844, iPhone Safari UA)로 https://yeon.world/ 스크린샷 저장.
- 발견: 서비스 카드 grid가 `repeat(services.length, 1fr)`로 모바일에서도 3열 고정되어 카드 폭이 약 100px로 줄어듦.
- 영향: 긴 한국어 제목/설명이 한두 글자 단위로 줄바꿈되어 “글자들이 줄줄이” 내려가는 현상 발생.
- 개선 방향: 모바일 1열, sm 2열, lg 3열 반응형 grid + `break-keep`으로 한국어 어절 단위 가독성 보강.

### 2차: 반응형 레이아웃 수정
- `apps/web/src/features/landing-home/landing-home.tsx` 수정.
- 모바일: 서비스 카드 1열.
- sm 이상: 2열, lg 이상: 3열.
- 한국어 제목/설명/대상 배지에 `break-keep` 적용.
- 카드 자체에 `min-w-0` 적용해 좁은 그리드/플렉스에서 텍스트 폭 계산이 깨지지 않도록 보강.

### 3차: 검증 및 모바일 재확인
- `pnpm --filter @yeon/web lint` 통과.
- `pnpm --filter @yeon/web typecheck` 통과.
- `git diff --check` 통과.
- `pnpm --filter @yeon/web build` 통과.
- `PORT=3007 pnpm --filter @yeon/web start` 후 Playwright 모바일 viewport로 로컬 스크린샷 저장: `output/playwright/yeon-world-mobile-home-local-fixed.png`.
- 재확인 결과: 모바일에서 서비스 카드가 1열로 표시되고 제목/설명이 세로로 줄줄이 쪼개지는 현상 제거됨.
- 최종 통합 검증 `pnpm validate` 통과: lint 8/8, typecheck 8/8, db drift 없음.

## 완료 요약
- 원인: production 랜딩의 서비스 카드 grid가 모바일에서도 3열 고정.
- 수정: 모바일 1열 / sm 2열 / lg 3열 responsive grid로 변경하고 한국어 텍스트 `break-keep` 적용.
- main 반영은 저장소 정책상 direct push가 아니라 main 대상 PR/merge로 진행.
