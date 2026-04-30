# 작업-codex | chat-service 모바일 스플래시와 OTP 전송

- 주체: Codex CLI
- 워크트리: A (`/home/osuma/coding_stuffs/yeon`)
- 브랜치: `develop`
- 작업창(예상): 06:39 ~ 08:00
- 실제 시작: 06:39
- 실제 종료: 06:47
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)

- `apps/mobile/**`
- `apps/web/src/app/api/v1/chat-service/auth/**`
- `apps/web/src/server/services/chat-service/**`
- `packages/api-contract/src/chat-service.ts`

## 절대 건드리지 않을 범위 (상대 주체 담당)

- `apps/web/src/app/auth/**`
- `apps/web/src/features/auth-credentials/**`
- `apps/web/src/server/auth/**`
- `apps/web/src/server/db/schema/auth-*`
- `apps/web/src/server/db/schema/users.ts`
- `apps/web/src/server/db/schema/password-*`

## 상대 주체 현황 스냅샷

- Claude가 웹 credential 로그인/회원가입 플로우를 진행 중이다.
- 현재 브랜치 워킹트리에 auth 관련 미커밋 변경이 있으므로 chat-service 인증 영역만 국소 수정한다.

## 차수별 작업내용

### 1차. 현황 파악

- 모바일 스플래시 자산 경로, Expo 설정, 앱 부트 흐름을 확인한다.
- chat-service OTP 전송이 실제 SMS를 보내는지, debug code만 반환하는지 확인한다.

### 2차. 스플래시 적용

- AI로 생성한 동물 이미지를 모바일 자산으로 저장한다.
- Expo native splash 설정과 앱 부트 화면에 반영한다.

### 3차. OTP 정합성 수정

- SMS provider 미연결 상태면 요청 성공 메시지를 수정하고 개발/운영 분기를 정리한다.
- 필요 시 API 계약과 모바일 UI 문구를 함께 맞춘다.

### 4차. 검증

- 변경 범위 lint, typecheck, build 가능 범위를 실행한다.
- 다른 작업자의 WIP로 실패하는 경우 범위를 분리해 보고한다.

## 실행 결과

- AI 생성 스플래시 이미지 저장: `apps/mobile/assets/images/chat-service-splash-animal.png`
- Expo native splash와 앱 내부 launch screen을 같은 이미지로 맞췄다.
- chat-service OTP는 개발 모드에서는 화면에 디버그 코드를 보여주고, 운영 모드에서는 가짜 성공 응답 대신 503 오류로 막는다.

## 검증

- `pnpm exec eslint apps/mobile/app/_layout.tsx apps/mobile/src/components/branding/app-launch-screen.tsx apps/mobile/src/features/chat-service/auth/auth-screen.tsx apps/mobile/src/providers/chat-service-session-provider.tsx apps/web/src/server/services/chat-service/auth-service.ts`
- `pnpm --filter @yeon/mobile lint`
- `pnpm --filter @yeon/mobile typecheck`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web build`
- `git diff --check -- apps/mobile apps/web/src/server/services/chat-service/auth-service.ts packages/api-contract/src/chat-service.ts personal_space/ai-log/2026-04-23/15-chat-service-모바일-스플래시와-OTP전송_BACKLOG.md 'personal_space/ai-log/2026-04-23/16-작업-codex_0639-0800_chat-service-mobile-splash-and-otp_[작업중].md'`
