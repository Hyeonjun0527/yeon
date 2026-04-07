---
name: code-review
description: critical/major/minor 구조화 코드 리뷰 절차와 상태 정합성 중심 체크리스트.
user_invocable: true
---

# Code Review

## 리뷰 목표

"어떤 리뷰가 와도 상태 전이, source of truth, 실패 경계, 사용자 영향까지 근거로 설명하고 방어할 수 있는 코드"를 만드는 것.

## 기본 수량 목표

- **critical**: 3개 이상
- **major**: 3개 이상
- **minor**: 3개 이상

실제 이슈가 이 수에 도달할 때까지 범위를 넓혀 탐색한다.

## 리뷰 절차

### Phase 1: Source of Truth 식별

1. 변경된 코드에서 원본 상태(source of truth)를 식별한다.
2. 파생 상태와 원본 상태를 구분한다.
3. 원본이 변경될 때 파생 상태가 함께 갱신/폐기되는지 확인한다.

### Phase 2: 상태 정합성 검증

1. `set`/`save`/`write`/`add` → 대응하는 `delete`/`clear`/`remove`/`reset` 확인
2. 캐시, 메모이즈, 폼 상태, 저장소 → 원본 변경과의 동기화 확인
3. 비동기 로직 → 순서 뒤집힘, 중복 실행, race condition 확인
4. 서버/클라이언트/SSR/route handler → 같은 개념의 규칙 일치 여부 확인

### Phase 3: 실패 경계 검증

1. 값 없음, decode 실패, null, undefined, empty 처리
2. 이전 값이 남아있을 가능성
3. 중복 호출, 재시도, 부분 실패
4. 로그아웃, 만료, 예외 시 정리 여부

### Phase 4: 경계 위반 확인

1. `apps/web/src/components` → `features`/`app` 의존 여부
2. `packages/*` → `apps/*` import 여부
3. `apps/mobile` → `apps/web/src/server` import 여부
4. 웹 전용 Server Actions로 공용 기능을 닫았는지

### Phase 5: 구현 품질

1. TypeScript `any`, `as` 단언 남용
2. CSS Modules 전역 셀렉터 단독 사용
3. Tailwind 동적 클래스 생성
4. 존재하지 않는 API/export 추측 생성
5. 로그·오류 메시지 한국어 여부

## 리뷰 코멘트 형식

각 이슈는 아래 형식으로 작성한다.

```
### [severity] 제목

- **위치**: 파일:라인
- **불변식 위반**: 어떤 불변식이 깨지는가
- **사용자 영향**: 어떤 사용자 영향이 생기는가
- **원인**: 왜 그런 버그가 생기는가
- **수정 제안**: 구체적인 수정 방향
```

## 리뷰 체크리스트 (최종)

- [ ] 이 값의 원본은 무엇인가
- [ ] 실패하면 이전 상태가 남는가
- [ ] 로그아웃, 만료, 예외 시 정리되는가
- [ ] 서버와 클라이언트 규칙이 같은가
- [ ] 여러 번 실행해도 상태가 꼬이지 않는가
- [ ] import 경계를 위반하지 않는가
- [ ] API 계약과 실제 구현이 일치하는가
