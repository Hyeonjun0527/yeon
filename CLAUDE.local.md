# CLAUDE.local.md

이 파일은 공용 `CLAUDE.md`를 보완하는 개인 작업 스타일 문서다.
팀 규칙과 충돌하지 않는 선에서 개인 습관과 리뷰 기준을 정의한다.

## OAuth 리디렉션 URI 규칙

상담 연동 OAuth 앱(Google Drive, Microsoft 등) 설정 시 리디렉션 URI는 반드시 4개를 등록한다:

```
http://localhost:3000/counseling-service/api/v1/integrations/<provider>/auth/callback
https://yeon.world/counseling-service/api/v1/integrations/<provider>/auth/callback
https://www.yeon.world/counseling-service/api/v1/integrations/<provider>/auth/callback
https://dev.yeon.world/counseling-service/api/v1/integrations/<provider>/auth/callback
```

루트 소셜 로그인(Kakao, Google Sign-In)은 별도이며 `/api/auth/<provider>/callback`를 유지한다.

## 작업 스타일

- 설명은 간결하게, 핵심만 전달한다.
- 불필요한 확인 질문 없이 바로 실행한다.
- 한 번에 끝낼 수 있는 수정은 계획만 길게 쓰지 않고 바로 구현한다.

## 커밋 메시지 세부 규칙

- 커밋 메시지는 반드시 한국어로 작성한다.
- 최소한 변경 대상, 핵심 동작 변화, 수정 의도가 드러나야 한다.
- `fix: 수정`, `fix: 리뷰 반영`, `refactor: 정리`처럼 모호한 메시지는 금지한다.
- 좋은 예: `fix: 웹 인증 세션 분기에서 모바일 공용 계약 참조로 통일`
- 좋은 예: `feat: 웹 온보딩 카드에 디자인 시스템 기반 CTA 구조 추가`
- 나쁜 예: `fix: 세션 정리`

## 개발 계획 / 백로그 규칙

- 코드 수정, 리팩토링, 설계 변경, API 추가, DDL 변경처럼 실제 개발 작업에 들어가기 전에는 반드시 먼저 백로그 문서를 작성한다.
- 백로그 문서는 항상 `personal_space/YYYY-MM-DD/N-적당한이름_BACKLOG.md` 경로에 작성한다.
- 이미 같은 주제의 백로그를 완료했다면 기존 파일명에는 `(완)`을 붙여 보관하고, 새 백로그는 숫자를 이어 붙인 새 파일로 만든다.
- 개발 계획은 `차수` 단위 backlog 형식으로 작성한다.
- 각 차수에는 최소한 `작업내용`, `논의 필요`, `선택지`, `추천`, `사용자 방향` 항목이 있어야 한다.
- `사용자 방향`이 비어 있으면 `추천` 기준으로 진행한다.

## 구현 원칙

- 값이 진실의 원천(source of truth)이 되도록 설계한다.
- raw 문자열을 분기 곳곳에 흩뿌리지 않는다. 같은 의미를 두 번 이상 비교해야 하면 상수 객체로 승격한다.
- TypeScript `enum`은 런타임 산출물이 실제로 필요한 경우에만 사용한다. 기본값은 `as const` 객체와 literal union 조합이다.
- Single Responsibility Principle을 지킨다. 파일, 함수, 훅, 컴포넌트는 가능한 한 하나의 이유로만 변경되게 유지한다.
- 조건 분기를 줄인다. 깊은 `if` 중첩보다 의미 있는 상태 변수, 조기 반환, 매핑 테이블, 작은 보조 함수나 컴포넌트 분리를 우선한다.
- 주석은 필요한 곳에만 단다. "무엇인가"보다 "왜 따로 존재하는지"를 설명할 때만 단다.
- 로그 메시지, 오류 메시지, 실패 이유 문자열은 한국어를 기본으로 한다.

## 코드 리뷰 원칙

- 목표는 "어떤 리뷰가 와도 상태 전이, source of truth, 실패 경계, 사용자 영향까지 근거로 설명하고 방어할 수 있는 코드"를 만드는 것이다.
- 리뷰어가 문제 삼을 수 있는 상태 오염 가능성 자체를 먼저 제거하는 방어적 리팩토링을 우선한다.
- 사용자가 코드리뷰를 요청하면 `critical 3개 이상`, `major 3개 이상`, `minor 3개 이상`의 검토 포인트를 찾는 것을 기본 목표로 삼는다.
- 상태 정합성 중심으로 검토한다. 정상 흐름만 보지 말고 상태가 깨지는 지점을 먼저 의심한다.
- 먼저 source of truth를 식별한다. 원본 상태와 파생 상태를 구분한다.
- `set`, `save`, `write`, `add` 로직을 보면 `delete`, `clear`, `remove`, `reset` 로직도 반드시 함께 확인한다.
- 캐시, 파생값, 메모이즈, 저장소, 폼 상태처럼 원본을 복제하는 구조는 원본 변경 시 함께 갱신되거나 폐기되는지 확인한다.
- 비동기 로직은 항상 순서 뒤집힘과 레이스를 의심한다.
- 리뷰 기준은 "맞아 보이는가"가 아니라 "거짓 상태가 남을 수 있는가"다.
- 리뷰 체크리스트:
  - 이 값의 원본은 무엇인가
  - 실패하면 이전 상태가 남는가
  - 로그아웃, 만료, 예외 시 정리되는가
  - 서버와 클라이언트 규칙이 같은가
  - 여러 번 실행해도 상태가 꼬이지 않는가

## 스타일링 원칙

- 기본 Tailwind 유틸리티 사용을 허용한다.
- 기본 scale로 충분하면 그대로 쓴다.
- dynamic Tailwind class 생성은 하지 않는다.
- arbitrary value는 기존 scale이나 토큰으로 표현할 수 없고 반복 가능성이 있을 때만 쓴다.
- 전역 CSS에는 화면 전용 스타일이나 임시 수정용 스타일을 넣지 않는다.
