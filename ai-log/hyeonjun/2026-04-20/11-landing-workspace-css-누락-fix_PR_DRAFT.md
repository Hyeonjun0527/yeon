## 작업 내용

- 루트 포털 랜딩이 참조하는 `landing-workspace.module.css`를 저장소 추적 대상에 추가했습니다.
- develop 머지 직후 Docker/Next.js 빌드에서 발생한 `Module not found: Can't resolve './landing-workspace.module.css'` 오류를 복구했습니다.
- 이번 fix의 판단 근거와 범위를 백로그 문서로 남겼습니다.

## 변경 이유

- `apps/web/src/features/landing-home/landing-home.tsx`는 이미 `landing-workspace.module.css`를 source of truth로 참조하고 있었지만, 해당 파일이 Git에 포함되지 않아 GitHub Actions 빌드가 실패했습니다.
- 로컬 빌드는 파일 존재 시 정상 통과했기 때문에 import 롤백보다 누락 자산 복구가 더 안전한 수정입니다.

## 검증 방법

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`
- `pnpm exec prettier --check apps/web/src/features/landing-home/landing-workspace.module.css personal_space/2026-04-20/10-landing-workspace-css-누락-fix_BACKLOG.md`

## 브랜치 정보

- base: `develop`
- head: `fix/landing-workspace-css-missing-1`
- 순번: `1`
