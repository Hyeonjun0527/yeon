---
name: validate
description: 코드 변경 후 실행하는 lint → format → typecheck → build 검증 파이프라인.
---

# Validate

## 언제 실행하는가

- 코드 수정 후 커밋 전
- PR 생성 전
- develop 머지 후 통합 검증 시

## 검증 순서

아래 순서를 반드시 지킨다. 앞 단계가 실패하면 수정 후 다시 실행한다.

### 1. Lint Fix

```bash
pnpm lint
```

- turbo가 변경된 workspace만 lint한다.
- 에러가 있으면 자동 수정 가능한 것은 `--fix`로 처리하고, 불가능한 것은 직접 수정한다.

### 2. Format Fix

```bash
pnpm prettier:fix
```

- 포맷 불일치를 자동 교정한다.

### 3. Typecheck

```bash
pnpm typecheck
```

- turbo가 전체 workspace를 typecheck한다.
- 타입 에러는 반드시 수정한다. `any`나 `@ts-ignore`로 우회하지 않는다.

### 4. Build (필수)

```bash
pnpm --filter @yeon/web build
```

- Next.js 빌드가 성공해야 한다.
- CSS Modules "Selector is not pure" 에러에 주의한다.
- 이 단계는 **생략 불가**다.

### 5. Test (필요 시)

- 변경 범위에 테스트가 존재하면 실행한다.
- 테스트 스크립트가 없으면 미실행 사유를 명시한다.

## 실패 시

- 실패한 단계의 에러 메시지를 분석한다.
- 수정 후 실패한 단계부터 다시 실행한다.
- 모든 단계를 통과해야 커밋 가능하다.

## 문서 전용 변경

- 코드 변경이 없는 문서 수정은 최소한 `git diff --check`로 형식을 검증한다.
