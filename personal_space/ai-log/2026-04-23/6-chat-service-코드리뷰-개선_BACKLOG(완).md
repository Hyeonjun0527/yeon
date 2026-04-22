# 6. chat-service 코드리뷰 개선 BACKLOG

## 차수 1

### 작업내용
- chat-service 구현 diff를 기준으로 strict code-review finding을 다시 정리한다.
- critical/major 우선순위로 seed 런타임 노출, 프로필 source of truth, 계정삭제 실패 경계, 신고 대상 검증 문제를 수정한다.
- 수정 후 mobile/web/api-contract/api-client 범위 검증을 다시 실행한다.
- `.omc/reviews/*.md`와 최종 review 로그를 현재 결과에 맞게 갱신한다.

### 논의 필요
- demo seed는 완전 제거할지, 명시적 환경변수 플래그로만 허용할지 결정이 필요하다.
- public profile 조회는 차단 관계에서 403으로 막을지, 최소 공개 프로필만 계속 보여줄지 정책 정리가 필요하다.

### 선택지
1. runtime seed를 완전 제거하고 로컬 seed script를 별도 분리한다.
2. runtime seed는 유지하되 `ENABLE_CHAT_SERVICE_DEMO_SEED=true`일 때만 명시적으로 허용한다.
3. public profile 조회는 누구나 가능하게 두고, block/DM/action 시점만 제한한다.
4. public profile 조회도 차단 관계에서는 즉시 403으로 막는다.

### 추천
- `2번 + 4번`
- 이유: 현재 구현을 크게 흔들지 않으면서 운영 사고를 막고, 차단 관계의 불변식을 프로필 조회까지 일관되게 유지할 수 있다.

### 사용자 방향
