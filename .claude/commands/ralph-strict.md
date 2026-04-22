---
name: ralph-strict
description: ralph 루프에 inline Socratic 게이트와 story-level code-review를 구조적으로 의무화한 엄격 모드. wrapper 안에서 interview 를 직접 돌려 deep-interview 본체의 terminal handoff 문제를 회피한다.
user_invocable: true
---

# Ralph Strict

## 언제 사용하는가

- 멀티-피처가 쌓인 branch 를 하나의 PRD 로 소진할 때
- 리뷰 지점이 두 개 이상 필요한 작업 (critical/major/minor 각 3개 이상 결함을 구조적으로 찾아야 할 때)
- vague 한 아이디어를 구현까지 끌고 가면서 정합성 깨지는 걸 막고 싶을 때

한 줄짜리 버그 픽스나 기계적 rename 에는 과잉이다. 그때는 ralph 본체나 executor 를 쓴다.

## 왜 이 wrapper 가 존재하는가

`/oh-my-claudecode:ralph` 본체는 PRD-driven 루프지만 두 가지가 빠져 있다:

1. **입력 모호성 게이트 없음** — task 문장이 모호해도 scaffold PRD 로 시작한다.
2. **story-level 결함 검증이 reviewer 단계에 모여 있음** — Step 7 reviewer 한 번만 본다. story 하나가 반쯤 잘못 구현되어도 passes: true 로 넘어간다.

`oh-my-claudecode:deep-interview` 는 (1) 의 해답처럼 보이지만 **terminal handoff skill** 이다 — Phase 5 에서 반드시 다른 Skill(autopilot/ralph/team/ralplan) 로 넘어가거나 무한 refine 루프로 되돌아간다. "spec 만 쓰고 caller 로 반환" 하는 옵션이 없다. 그래서 wrapper 에서 `Skill("...:deep-interview")` 를 호출하면 control flow 가 끊겨 strict criterion 주입이 실행되지 못한다.

이 wrapper 는 대신 **deep-interview 의 방법론만 차용** 해서 Socratic 루프를 wrapper 안에서 직접 돌린다. Phase 5 execution bridge 는 존재하지 않으므로 게이트 통과 뒤 PRD 작성 → ralph 호출 흐름이 보장된다.

핵심 주입:

- **inline Socratic 게이트를 ralph 이전 의무 게이트로 박는다.** spec 이 ambiguity ≤ threshold 로 크리스털라이즈되기 전엔 PRD 를 쓰지 않는다.
- **각 story 에 `CR-PASS-C3-M3-m3` acceptance criterion 을 의무적으로 꽂는다.** code-review 스킬이 critical ≥ 3, major ≥ 3, minor ≥ 3 을 찾고 critical/major 를 모두 해소해야 passes: true.

## 의무 실행 절차

### 0. 사전 체크

- `git status` + `git log origin/develop..HEAD --oneline` 로 현재 브랜치 상태 확인
- `personal_space/ai-log/<오늘>/` 에서 상대 주체(Claude/Codex) `[작업중]` 문서 열람 → 범위 겹치면 재분할
- `.omc/prd.json` 이 이미 있고 아직 모두 passes: true 가 아니면 "기존 PRD 이어서 진행할지, 새 interview 부터 다시 시작할지" 확인
- 작업 로그 신규 파일을 `personal_space/ai-log/YYYY-MM-DD/N-작업-claude_HHMM-HHMM_{주제}_[작업중].md` 로 생성

### 1. Inline Socratic 게이트 (의무, 1회)

**deep-interview 본체를 `Skill()` 로 호출하지 않는다.** 대신 아래 루프를 wrapper 가 직접 실행한다.

#### 1a. Brownfield 탐색

- `Task(subagent_type="explore", model="haiku")` 로 저장소 현황 탐색 → `codebase_context` 로 저장
- 결과가 비어 있으면 greenfield 로 처리

#### 1b. Socratic 루프 (최대 20 round, soft warning 10, early exit round 3+)

- **1 round = 1 질문.** 여러 질문을 batch 하지 않는다.
- 질문 선정 기준: 현재 가장 약한 clarity 차원 (Goal / Constraints / Success Criteria / Context[brownfield]) 을 명시적으로 지목하고 그 차원을 보강할 질문만 던진다.
- 질문 방식: `AskUserQuestion` 으로 options + 자유입력 제공.
- 매 round 헤더 포맷:
  ```
  Round {n} | Targeting: {weakest_dimension} | Why: {one_sentence_rationale} | Ambiguity: {score}%
  ```
- 매 답변 후 다음 JSON 스키마로 ambiguity 점수화 (내부 계산, 사용자에게는 표 형태로 표시):
  ```
  { goal, constraints, criteria, context?, weakest_dimension, ontology: [{name,type,fields,relationships}] }
  ```
- ambiguity 계산:
  - greenfield: `1 - (goal*0.40 + constraints*0.30 + criteria*0.30)`
  - brownfield: `1 - (goal*0.35 + constraints*0.25 + criteria*0.25 + context*0.15)`
- threshold 는 `.claude/settings.json` 의 `omc.deepInterview.ambiguityThreshold` → 없으면 `0.2`
- Challenge agent prompt 주입 (wrapper 본문에 자연어로 삽입):
  - round 4+: Contrarian ("What if the opposite were true?")
  - round 6+: Simplifier ("What's the simplest version that still works?")
  - round 8+ (ambiguity > 0.3): Ontologist ("What IS this, really?")
- Ontology stability: round 2+ 부터 전 round entity 와 비교해 stability_ratio 계산, 두 round 연속 1.0 이면 수렴으로 간주.
- 루프 종료 조건:
  - ambiguity ≤ threshold → Step 1c 로
  - 사용자가 "enough / let's go / build it" (round 3+) → 경고와 함께 Step 1c 로
  - round 20 hard cap → 현재 상태로 Step 1c 로

#### 1c. Spec 크리스털라이즈 (wrapper 가 직접 파일 생성)

`.omc/specs/deep-interview-<slug>.md` 에 다음 구조로 작성:

```markdown
# Deep Interview Spec: {title}

## Metadata
- Interview ID, Rounds, Final Ambiguity, Type, Generated, Threshold, Status

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |

## Goal
## Constraints
## Non-Goals
## Acceptance Criteria
- [ ] {testable criterion 1}
- [ ] ...

## Assumptions Exposed & Resolved
## Technical Context
## Ontology (Key Entities)
## Ontology Convergence
## Interview Transcript (collapsible)
```

> **Phase 5 execution bridge 를 만들지 않는다.** spec 파일만 쓰고 Step 2 로 진행.

### 2. PRD 생성 (Strict Template 기반)

- `.omc/prd-strict-template.json` 이 있으면 읽고, 없으면 아래 인라인 scaffold 를 그대로 사용:

```json
{
  "name": "ralph-strict-<slug>",
  "stories": [
    {
      "id": "US-001",
      "title": "<story title>",
      "description": "<story scope>",
      "acceptanceCriteria": [
        "<task-specific criterion>",
        "DI-PASS: deep-interview spec (.omc/specs/deep-interview-<slug>.md) 의 acceptance criteria 와 정합. 새 entity 도입 시 spec 재크리스털라이즈 완료.",
        "CR-PASS-C3-M3-m3: /code-review 스킬로 이 story 변경 파일 리뷰, critical ≥ 3 / major ≥ 3 / minor ≥ 3 식별 후 critical + major 전부 해소. 리뷰 로그는 .omc/reviews/US-XXX.md."
      ],
      "passes": false
    }
  ]
}
```

- deep-interview spec 의 각 acceptance criterion 을 1:1 로 story 에 매핑.
- **모든 story 의 `acceptanceCriteria` 에 위 DI-PASS / CR-PASS-C3-M3-m3 두 항목이 반드시 들어가야 한다.** 하나라도 누락되면 Step 2 실패로 간주하고 재작성.
- 완성된 PRD 를 `.omc/prd.json` 에 쓴다.

### 3. Ralph 본체 호출

```
Skill("oh-my-claudecode:ralph") --critic=critic "PRD 는 .omc/prd.json 에 이미 작성됨. 각 story 의 의무 DI-PASS / CR-PASS-C3-M3-m3 criterion 을 반드시 충족해야 passes: true."
```

- 호출 전 ralph 본체의 `argument-hint` 를 확인해 `--critic` 허용값이 실제로 `critic` 인지 확인. `architect`/`codex` 만 허용되면 그 값을 사용. (네트워크 의존을 이유로 `codex` 는 기본값 아님.)
- `--no-deslop` 은 쓰지 않는다. deslop 의무 유지.

### 4. 각 Story 의무 훅 (ralph 루프 안에서)

ralph 가 각 story 를 impl → verify 하는 사이에 아래를 명시적으로 끼워 넣는다.

#### 4a. Story 구현 직후 (verify 전)

- 이 story 에서 **새 entity / 새 domain concept** 가 등장했는지 점검.
- 등장했으면 Step 1 의 Socratic 루프를 **mini 모드로 재호출** — 기존 spec 파일을 context 로 제공하고 바뀐 부분만 2~3 round 추가 interview. ambiguity 가 threshold 이하로 다시 떨어지면 spec 파일의 Ontology / Acceptance Criteria / Ontology Convergence 섹션 업데이트.
- 새 entity 가 없으면 skip.

#### 4b. Story verify 단계

- `Skill("code-review")` 또는 로컬 `/code-review` 호출.
- 리뷰 대상: 이 story 에서 변경된 파일 목록 (`git diff --name-only origin/develop...HEAD -- <story-scope>` 또는 `git diff HEAD~<story-commit-count>..HEAD`).
- critical ≥ 3, major ≥ 3, minor ≥ 3 탐색. 실제 이슈가 수량에 못 미치면 범위를 넓혀 전수조사 후 `.omc/reviews/US-XXX.md` 에 "탐색 범위: X / Y / Z 파일, 전수조사 완료, 실제 발견 N개" 형태로 근거 명시 (허위 채움 금지).
- critical + major 항목은 **같은 story 안에서** 수정한다 — 다음 story 로 넘기지 않는다.
- minor 는 `.omc/reviews/US-XXX.md` 에 기록 후 follow-up story 로 승격하거나 명시적으로 수용.

#### 4c. passes: true 기록 조건

- DI-PASS + CR-PASS-C3-M3-m3 두 항목 모두 로그 증거가 남아있어야 함.
- 증거 없으면 passes: false 유지.

### 5. 전체 완료 후 최종 Review (Step 7 보강)

- ralph 본체의 Step 7 reviewer(critic) 가 끝나면, `Skill("code-review")` 를 **전체 diff 대상으로** 한 번 더 호출.
- 대상: `git diff origin/develop...HEAD`
- 초점: "story 간 경계 누수" — 상태 정합성, source of truth drift, 경계 위반 같은 cross-cutting 결함 전수검사.
- 결과는 `.omc/reviews/FINAL.md`.

### 6. Deslop + Regression

- `Skill("ai-slop-cleaner")` → 변경 파일 한정 청소
- `pnpm lint && pnpm typecheck && pnpm --filter @yeon/web build` 재검증
- 실패 시 롤백 또는 픽스 후 재실행

### 7. 종료

- `/oh-my-claudecode:cancel` 로 ralph 상태 정리
- 작업 로그 파일 rename: `_[작업중].md` → `_{종료HHMM}_{주제}_[완료].md` + 문서 내부 "실제 종료" 갱신
- wrapper 결과 요약: 완료 story 수, 총 리뷰 이슈 (c/M/m), 최종 commit hash

## 구조적 강제 매커니즘

| 구멍 | 본체 ralph | ralph-strict 차단 방법 |
|---|---|---|
| 모호한 입력으로 시작 | scaffold PRD 로 시작 | wrapper 내 Socratic 루프가 spec 없으면 PRD 작성 거부 |
| story 를 얕게 리뷰 | Step 7 한 번만 | CR-PASS 가 acceptance criteria 에 박혀서 passes: true 불가 |
| 새 entity 유입 무시 | 계속 진행 | DI-PASS + mini Socratic 루프가 재검증 요구 |
| 최종 리뷰가 Story 경계 놓침 | critic 한 번만 | 전체 diff 대상 2차 code-review 의무 |
| deep-interview 본체의 Phase 5 강제 handoff | 해당 없음 | `Skill("...:deep-interview")` 호출 금지, wrapper 내 inline 루프 |

## 실행 명령 예시

```
/ralph-strict 현재 브랜치에 쌓인 card-service / OAuth 보안 / DB-PK bigint 마이그레이션을 하나의 PRD 로 소진한다. 각 주제가 story 하나 이상이며, Step 5 에서 최종 code-review 로 cross-cutting 결함을 찾는다.
```

## 출력 산출물

- `personal_space/ai-log/<오늘>/N-작업-claude_HHMM-HHMM_<주제>_[완료].md` — 작업 로그 (AGENTS.md 규칙)
- `.omc/specs/deep-interview-<slug>.md` — wrapper 내 Socratic 루프가 쓴 크리스털라이즈 spec
- `.omc/prd.json` — DI-PASS / CR-PASS-C3-M3-m3 criterion 포함 PRD
- `.omc/reviews/US-XXX.md` — 각 story code-review 로그
- `.omc/reviews/FINAL.md` — 전체 diff 최종 리뷰
- `.omc/progress.txt` — ralph 본체가 쓰는 진행 로그

## 주의사항

- 이 wrapper 는 `oh-my-claudecode:ralph` 본체를 수정하지 않는다. 본체 업데이트와 독립 동작.
- **`Skill("oh-my-claudecode:deep-interview")` 를 호출하지 않는다.** 이 본체는 Phase 5 에서 다른 Skill 로 반드시 handoff 하므로 wrapper control flow 가 끊긴다. 방법론만 차용하고 실행은 wrapper 안에서 한다.
- 동시 작업 인식: 다른 agent 가 같은 파일을 수정 중일 수 있다. code-review 는 WIP 인식 규칙을 따른다 (`.claude/commands/code-review.md` 참조).
- 작업 로그 / 백로그 / docs 는 `personal_space/ai-log/` 또는 `personal_space/docs/` 하위로만 쓴다 (AGENTS.md §1).
