---
name: self-improve-checklist
description: 코드 작성 후 자기 점검 체크리스트.
---

# Self Improve Checklist

## Level 0: 동작 동등성

- [ ] 기존 동작과 계약을 불필요하게 바꾸지 않았다
- [ ] web/mobile/shared 경계를 흐리지 않았다
- [ ] UI 생성 도구 결과를 그대로 두지 않고 저장소 기준에 맞게 다듬었다

## Level 1: 기본 품질

- [ ] 존재하지 않는 스크립트나 API를 가정하지 않았다
- [ ] 변경 범위에 맞는 lint / format / typecheck / test를 확인했다
- [ ] 검증 불가 항목이 있다면 이유를 명확히 남겼다

## Level 2: 구조

- [ ] `apps/*`와 `packages/*`의 책임이 섞이지 않았다
- [ ] `apps/mobile`이 `apps/web/src/server`를 import하지 않는다
- [ ] 공용으로 써야 하는 기능은 `api-contract` 기준으로 정리했다
- [ ] 아직 한 군데에서만 쓰이는 로직을 과하게 shared package로 올리지 않았다

## Level 3: 스타일링

- [ ] 기본 Tailwind 유틸리티를 불필요하게 금지하지 않았다
- [ ] 토큰은 반복 의미가 있을 때만 추가했다
- [ ] 기존 scale로 충분한데 arbitrary value를 남발하지 않았다

## Level 4: 설명 가능성

- [ ] 왜 이 위치에 코드를 두었는지 설명 가능하다
- [ ] source of truth가 어디인지 설명 가능하다
- [ ] 다음 확장 시 mobile/web 어느 쪽이 영향을 받는지 설명 가능하다

## Level 5: 운영 절차

- [ ] landing 단위가 브랜치와 PR 단위와 일치하는가
- [ ] 커밋, push, PR 절차가 `git-pr-workflow.md`와 맞는가
- [ ] 유의미한 작업이라면 회고 문서 갱신 필요성을 확인했는가
