---
name: expo-patterns
description: `apps/mobile`에서 Expo 앱 구조를 잡는 기준.
user_invocable: true
---

# Expo Patterns

## 원칙

- 모바일은 공용 HTTP API와 `packages/api-contract`를 기준으로 움직인다.
- 서비스 계층은 `src/services`로 모으고, 화면 컴포넌트에는 orchestration 결과만 전달한다.
- native-specific theme 매핑은 `src/theme`에 둔다.
- web 내부 구현에 직접 기대지 않는다.

## 금지 패턴

- `apps/web/src/server` 직접 import
- 화면 컴포넌트에 네트워크 로직과 재시도 정책을 그대로 퍼뜨리는 것
- web와 mobile이 서로 다른 계약을 로컬 타입으로 따로 들고 가는 것
