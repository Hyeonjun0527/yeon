---
name: ralph-strict
description: ralph 루프에 deep-interview 게이트와 story-level code-review를 구조적으로 의무화한 엄격 모드. 옵션 B — interview 1회 게이트 + 모호 재호출, review 각 story 후 + 최종 1회.
user_invocable: true
---

# Ralph Strict

## 언제 사용하는가

- 멀티-피처가 쌓인 branch를 하나의 PRD로 소진할 때
- 리뷰 지점이 두 개 이상 필요한 작업 (critical/major/minor 각 3개 이상 결함을 구조적으로 찾아야 할 때)
- vague한 아이디어를 구현까지 끌고 가면서 정합성 깨지는 걸 막고 싶을 때

한 줄짜리 버그 픽스나 기계적 rename에는 과잉이다. 그때는 ralph 본체나 executor를 쓴다.

## 왜 이 wrapper가 존재하는가

`/oh-my-claudecode:ralph` 본체는 PRD-driven 루프지만 두 가지가 빠져 있다:

1. **입력 모호성 게이트 없음** — 사용자 task 문장이 모호해도 ralph는 일단 scaffold PRD를 쓰고 시작한다. acceptance criteria가 "task-specific"이어야 한다는 규칙은 있지만 "어떻게 명확화할지"는 맡겨 놓는다.
2. **story-level 결함 검증이 reviewer 단계에 모여 있음** — Step 7 reviewer 한 번만 본다. story 하나가 반쯤 잘못 구현되어도 그대로 passes: true 처리되고 다음 story로 넘어간다.

이 두 구멍을 이 wrapper가 막는다:

- **deep-interview를 ralph 이전 의무 게이트로 박는다.** spec이 ambiguity ≤ threshold로 크리스털라이즈되기 전엔 PRD를 쓰지 않는다.
- **각 story에 `CR-PASS-C3-M3-m3` acceptance criterion을 의무적으로 꽂는다.** code-review 스킬이 critical ≥ 3, major ≥ 3, minor ≥ 3을 찾고 critical/major를 모두 해소해야 passes: true.

## 의무 실행 절차 (옵션 B)

### 0. 사전 체크

- `git status` + `git log origin/develop..HEAD --oneline`로 현재 브랜치 상태 확인
- `.omc/prd.json`이 이미 있고 아직 모두 passes: true가 아니면 "기존 PRD 이어서 진행할지, 새 interview부터 다시 시작할지" 확인

### 1. Deep Interview 게이트 (의무, 1회)

```
Skill("oh-my-claudecode:deep-interview") + 사용자 task description
```

- ambiguity ≤ threshold (기본 0.2)까지 반복 — 이 단계를 건너뛰지 않는다.
- 크리스털라이즈된 spec이 `.omc/specs/deep-interview-<slug>.md`에 쓰이기 전까진 ralph 시작 금지.
- deep-interview가 execution bridge(Phase 5)에서 옵션을 물어보면 **"Execute with ralph"를 선택하지 않고**, 결과 spec 경로만 받아서 돌아온다. 이 wrapper가 ralph 호출을 직접 관리한다.

### 2. PRD 생성 (Strict Template 기반)

- `.omc/prd-strict-template.json`을 읽는다.
- deep-interview spec의 각 acceptance criterion을 story로 매핑한다.
- **모든 story의 `acceptanceCriteria`에 아래 두 항목을 의무로 추가한다**:
  1. `"DI-PASS: deep-interview spec (.omc/specs/deep-interview-<slug>.md) 의 acceptance criteria와 정합. 새 entity 도입 시 spec 재크리스털라이즈 완료."`
  2. `"CR-PASS-C3-M3-m3: /code-review 스킬로 이 story의 변경 파일을 리뷰, critical ≥ 3 / major ≥ 3 / minor ≥ 3 식별 후 critical + major 전부 해소. 리뷰 로그는 .omc/reviews/US-XXX.md."`
- 완성된 PRD를 `.omc/prd.json`에 쓴다.

### 3. Ralph 본체 호출

```
Skill("oh-my-claudecode:ralph") --critic=critic "PRD는 .omc/prd.json에 이미 작성됨. 각 story의 의무 DI-PASS / CR-PASS-C3-M3-m3 criterion을 반드시 충족해야 passes: true."
```

- reviewer는 `--critic=critic`로 고정 (Claude critic agent). `--critic=codex`는 네트워크 의존성 있어 기본값 아님.
- `--no-deslop`은 쓰지 않는다. deslop 의무 유지.

### 4. 각 Story 의무 훅 (ralph 루프 안에서)

ralph가 각 story를 impl → verify 하는 사이에 아래를 명시적으로 끼워 넣는다:

#### 4a. Story 구현 직후 (verify 전)

- 이 story에서 **새로운 entity / 새로운 domain concept**가 등장했는지 점검한다.
- 등장했으면 `Skill("oh-my-claudecode:deep-interview")`를 **mini 모드로 재호출**한다 — 기존 spec 파일 경로를 context로 넘기고, 바뀐 부분만 추가 interview한다. ambiguity가 threshold 이하로 다시 떨어지면 spec 파일을 업데이트한다.
- 새 entity가 없으면 skip.

#### 4b. Story verify 단계

- `Skill("code-review")` 또는 `/code-review`를 호출한다.
- 리뷰 대상: 이 story에서 변경된 파일 목록 (`git diff --name-only`로 산출).
- critical ≥ 3, major ≥ 3, minor ≥ 3이 나오지 않으면 "리뷰 범위를 넓혀 다시 탐색"한다. 실제 이슈가 이 수량에 못 미치면 그 사실을 `.omc/reviews/US-XXX.md`에 "탐색 범위: X / Y / Z 파일, 가능 결함 전수조사 완료, 실제 발견 N개" 형태로 근거와 함께 기록한다.
- critical + major 항목은 **같은 story 안에서** 수정한다 — 다음 story로 넘기지 않는다.
- minor는 `.omc/reviews/US-XXX.md`에 기록하고 follow-up story로 승격하거나 명시적으로 수용한다.

#### 4c. passes: true 기록 조건

- DI-PASS + CR-PASS-C3-M3-m3 둘 다 로그 증거가 `.omc/reviews/US-XXX.md` / spec diff에 남아있어야 함.
- 증거 없으면 passes: false 유지.

### 5. 전체 완료 후 최종 Review (Step 7 보강)

- ralph 본체의 Step 7 reviewer(critic)가 끝나면, `Skill("code-review")`를 **전체 diff 대상으로** 한 번 더 호출한다.
- 대상: `git diff origin/develop...HEAD`
- 이번엔 "story 간 경계 누수"에 집중한다 — story-level 리뷰가 각자 놓친 cross-cutting 결함(상태 정합성, source of truth drift, 경계 위반)을 전수검사한다.
- 결과는 `.omc/reviews/FINAL.md`.

### 6. Deslop + Regression (ralph 본체 7.5/7.6 그대로)

- `Skill("ai-slop-cleaner")` → 변경 파일 한정 청소
- `pnpm lint && pnpm typecheck && pnpm --filter @yeon/web build` 재검증
- 실패 시 롤백 또는 픽스 후 재실행

### 7. 종료

- `/oh-my-claudecode:cancel`로 ralph 상태 정리
- 이 wrapper 결과 요약: 완료 story 수, 총 리뷰 이슈 (c/M/m), 최종 commit hash

## 구조적 강제 매커니즘

이 wrapper가 "건너뛰기"를 원천 차단하는 지점:

| 구멍 | 본체 ralph | ralph-strict 차단 방법 |
|---|---|---|
| 모호한 입력으로 시작 | Scaffold PRD로 일단 시작 | deep-interview 게이트가 spec 없으면 PRD 작성 거부 |
| story를 얕게 리뷰 | Step 7 한 번만 | acceptance criteria에 CR-PASS가 박혀서 passes: true 불가 |
| 새 entity 유입 무시 | 계속 진행 | DI-PASS가 재interview 결과를 요구 |
| 최종 리뷰가 Story 경계 놓침 | critic 한 번만 | 전체 diff 대상 2차 code-review 의무 |

## 실행 명령 예시

```
/ralph-strict 현재 브랜치에 쌓인 card-service / OAuth 보안 / DB-PK bigint 마이그레이션을 하나의 PRD로 소진한다. 각 주제가 story 하나 이상이며, Step 5에서 최종 code-review로 cross-cutting 결함을 찾는다.
```

## 출력 산출물

- `.omc/specs/deep-interview-<slug>.md` — interview 크리스털라이즈 spec (업데이트 이력 포함)
- `.omc/prd.json` — 의무 criterion 포함 PRD
- `.omc/reviews/US-XXX.md` — 각 story code-review 로그
- `.omc/reviews/FINAL.md` — 전체 diff 최종 리뷰
- `.omc/progress.txt` — ralph 본체가 쓰는 진행 로그

## 주의사항

- 이 wrapper는 `oh-my-claudecode:ralph` 본체를 수정하지 않는다. 본체 업데이트와 독립적으로 동작한다.
- deep-interview가 Phase 5에서 다른 execution 옵션(autopilot/team)을 선택하면 이 wrapper는 종료된다 — 사용자가 명시적으로 ralph-strict를 썼는데 다른 모드로 분기하는 건 계약 위반이기 때문.
- 동시 작업 인식: 다른 agent가 같은 파일을 수정 중일 수 있다. code-review는 WIP 인식 규칙을 따른다 (`.claude/skills/code-review.md` 참조).
