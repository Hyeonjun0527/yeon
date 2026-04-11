# Import Workspace Fullscreen Plan

## TL;DR

> **Quick Summary**: 외부 파일 가져오기 흐름을 student-management 내부의 임베디드 패널이 아니라, 뷰포트를 고정한 전용 fullscreen workspace로 재설계한다.
>
> **Deliverables**:
>
> - import mode 전용 fullscreen shell
> - file browser / PDF / XLSX / analysis 공통 viewport 규칙
> - page scroll 제거 + 내부 panel scroll 분리
> - 좌측 student-management chrome 숨김 규칙
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves + final verification
> **Critical Path**: Shell 분리 → panel sizing 규칙 통일 → content별 viewport 적용 → regression verification

---

## Context

### Original Request

사용자는 외부에서 가져오기 진입 시 현재 화면이 콘텐츠 크기만큼만 차지하거나 빈 검은 영역이 크게 남는 문제를 지적했다. 원하는 방향은 다음과 같다.

- 전체화면을 최대한 사용
- import 활성 시 기존 student-management 주변 UI 제거
- 뷰포트는 고정
- 스크롤은 페이지가 아니라 내부 panel에서 발생
- file browser / PDF / 대형 XLSX 모두 동일한 fullscreen workspace 규칙 사용

### Interview Summary

**Key Discussions**:

- 기존 고정 패널 방식은 공간 낭비가 심함
- content-sized expansion도 실패: PDF/XLSX/browser 상태마다 공백과 높이 붕괴 발생
- 사용자는 “전체화면 사용 + 내부 스크롤”을 핵심 원칙으로 명시함

**Research Findings**:

- `apps/web/src/app/home/student-management/layout.tsx`가 import mode 진입과 기존 shell 유지 책임을 가짐
- `apps/web/src/app/home/_components/create-space-modal.tsx`가 modal import 진입 경로를 가짐
- `apps/web/src/features/cloud-import/components/cloud-import-inline.tsx`가 실제 import workspace 본체임
- repo 내 counseling workspace / ai panel / fullscreen modal 패턴은 fullscreen shell 설계에 참고 가능함

### Metis Review

**Identified Gaps** (addressed in this plan):

- viewport 고정 책임을 shell과 content component 중 어디에 둘지 명확히 해야 함 → shell 고정, content는 panel contract만 따름
- 상태별 레이아웃 예외 처리로 다시 파편화될 위험 → 공통 shell contract를 우선하고 상태별 content는 그 안에 맞춤
- mobile/small viewport에서 내부 스크롤 충돌 가능성 → shell/body/page overflow ownership을 명시적으로 분리

---

## Work Objectives

### Core Objective

외부 파일 가져오기 흐름을 전용 fullscreen import workspace로 전환해, 어떤 파일 타입이든 빈 공간 낭비 없이 뷰포트를 안정적으로 사용하도록 만든다.

### Concrete Deliverables

- import mode 전용 fullscreen workspace shell
- 좌측 사이드바/주변 chrome 숨김 규칙
- 고정 viewport + 내부 스크롤 panel contract
- file browser 상태용 full-height list pane
- PDF preview 상태용 full-height document viewport
- XLSX preview 상태용 full-height preview viewport + internal horizontal/vertical scroll
- analysis/editor 상태용 고정 action/footer 영역 + scrollable body

### Definition of Done

- [ ] import mode 진입 시 student-management 기본 shell이 사라진다
- [ ] 브라우저 viewport 자체는 고정되고, page-level scroll이 생기지 않는다
- [ ] file browser / PDF / XLSX / analysis 상태 각각에서 내부 panel scroll만 동작한다
- [ ] 넓은 XLSX, 긴 PDF, 긴 분석 결과 모두 빈 검은 영역 없이 workspace를 채운다

### Must Have

- fullscreen shell은 viewport 기준 레이아웃 소유권을 가진다
- page scroll과 nested scroll ownership이 명확해야 한다
- 상단 header / content area / action area의 높이 계약이 명시되어야 한다

### Must NOT Have (Guardrails)

- content 높이에 따라 shell 높이가 늘어나는 구조 금지
- PDF만 예외, XLSX만 예외 같은 ad hoc 레이아웃 금지
- import mode에서도 student-management 좌측 nav가 남는 구조 금지
- preview component마다 자체적으로 viewport 높이를 추측하는 구조 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: existing web lint/typecheck/build + targeted UI verification

### QA Policy

모든 task는 agent-executed QA 시나리오를 가진다.

- **Frontend/UI**: Playwright로 viewport, scroll ownership, hidden chrome 확인
- **Build Safety**: lint / prettier / typecheck / build

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (foundation):
├── Task 1: fullscreen import shell contract 정의
├── Task 2: student-management layout import mode 분기 재설계
├── Task 3: modal import 진입 경로 fullscreen 규칙 정렬
└── Task 4: shared sizing/scroll ownership 문서화

Wave 2 (content adaptation):
├── Task 5: file browser state를 shell contract에 맞게 full-height화
├── Task 6: PDF preview state를 shell contract에 맞게 full-height화
├── Task 7: XLSX preview state를 shell contract에 맞게 full-height화
└── Task 8: analysis/editor panel을 fixed action + scroll body로 재구성

Wave FINAL:
├── Task F1: shell/viewport compliance audit
├── Task F2: visual workspace QA
├── Task F3: scroll-behavior regression QA
└── Task F4: scope fidelity check

Critical Path: 1 → 2 → 5/6/7/8 → F1-F4

### Dependency Matrix

- **1**: - → 2,3,5,6,7,8
- **2**: 1 → F1-F4
- **3**: 1 → F1-F4
- **4**: 1 → 5,6,7,8
- **5**: 1,4 → F2,F3
- **6**: 1,4 → F2,F3
- **7**: 1,4 → F2,F3
- **8**: 1,4 → F2,F3

### Agent Dispatch Summary

- **Wave 1**: T1-T4 → `visual-engineering`
- **Wave 2**: T5-T8 → `visual-engineering`
- **FINAL**: F1 → `oracle`, F2/F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Fullscreen Import Shell Contract 정의

  **What to do**:
  - import mode 전용 root shell 구조를 정의한다
  - shell이 viewport height를 소유하고 page scroll을 차단하도록 한다
  - header / workspace body / footer-action 영역 높이 계약을 정한다

  **Must NOT do**:
  - content component 내부에서 viewport 높이 추정 금지
  - magic number 누적 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `design-eye`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: 2,3,5,6,7,8
  - **Blocked By**: None

  **References**:
  - `apps/web/src/features/cloud-import/components/cloud-import-inline.tsx` - import UI root wrapper
  - `apps/web/src/app/home/student-management/layout.tsx` - import mode 진입 shell
  - `apps/web/src/features/counseling-record-workspace/counseling-record-workspace.module.css` - fullscreen workspace/grid 패턴

  **Acceptance Criteria**:
  - [ ] import workspace root가 viewport height 기준으로 계산된다
  - [ ] body scroll이 page가 아니라 workspace 내부에서만 발생한다

  **QA Scenarios**:

  ```
  Scenario: Import mode viewport ownership
    Tool: Playwright
    Steps:
      1. /home/student-management 접속
      2. OneDrive에서 가져오기 클릭
      3. document.body/client viewport와 workspace root 높이 비교
    Expected Result: workspace가 viewport를 채우고 body scroll은 증가하지 않음

  Scenario: Page scroll 없음
    Tool: Playwright
    Steps:
      1. import mode 진입
      2. mouse wheel로 페이지 전체 스크롤 시도
      3. workspace 내부 panel과 page scroll 위치를 비교
    Expected Result: page scroll은 고정, 내부 panel만 스크롤
  ```

- [ ] 2. Student-Management Shell 분기 재설계

  **What to do**:
  - import mode에서 좌측 nav / 기존 main padding / embedded shell을 제거한다
  - 일반 mode와 import mode를 명시적으로 분기한다

  **Must NOT do**:
  - import mode에서 좌측 student-management chrome 잔존 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: F1-F4
  - **Blocked By**: 1

  **References**:
  - `apps/web/src/app/home/student-management/layout.tsx` - 현재 분기/사이드바 렌더링 위치

  **Acceptance Criteria**:
  - [ ] import mode 진입 시 좌측 nav가 렌더되지 않는다
  - [ ] import mode 종료 시 기존 student-management shell로 정상 복귀한다

  **QA Scenarios**:

  ```
  Scenario: Chrome hidden in import mode
    Tool: Playwright
    Steps:
      1. import mode 진입
      2. 좌측 '전체 수강생', '스페이스' 영역 selector 확인
    Expected Result: 해당 chrome이 보이지 않음

  Scenario: Exit restores layout
    Tool: Playwright
    Steps:
      1. import mode 진입
      2. 목록으로 또는 닫기 클릭
      3. student-management 기본 레이아웃 확인
    Expected Result: 기존 shell 정상 복귀
  ```

- [ ] 3. Modal Import 경로 Fullscreen 규칙 정렬

  **What to do**:
  - create-space modal 경로에서도 fullscreen workspace 규칙을 재사용한다
  - modal chrome과 workspace chrome의 경계를 명확히 한다

  **Must NOT do**:
  - modal에서는 다른 sizing 규칙 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: F1-F4
  - **Blocked By**: 1

  **References**:
  - `apps/web/src/app/home/_components/create-space-modal.tsx` - modal import 진입 경로

  **Acceptance Criteria**:
  - [ ] modal import도 fullscreen workspace contract를 공유한다
  - [ ] backdrop/modal shell과 import shell이 서로 scroll 충돌을 만들지 않는다

  **QA Scenarios**:

  ```
  Scenario: Modal import fills available viewport
    Tool: Playwright
    Steps:
      1. 스페이스 만들기 → 파일에서 가져오기 진입
      2. workspace root 크기와 viewport 크기 비교
    Expected Result: modal 내부에서 최대한 크게 펼쳐지고 내부 scroll만 동작
  ```

- [ ] 4. Shared Sizing/Scroll Ownership 문서화

  **What to do**:
  - shell / preview / analysis / action 영역의 overflow 책임을 정리한다
  - future regressions 방지를 위해 코드 주석 또는 작은 내부 규칙을 남긴다

  **Must NOT do**:
  - hidden 규칙을 암묵적으로 남기지 말 것

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5,6,7,8
  - **Blocked By**: 1

  **References**:
  - `apps/web/src/features/cloud-import/components/cloud-import-inline.tsx`

  **Acceptance Criteria**:
  - [ ] shell / panel overflow ownership이 문서화된다

  **QA Scenarios**:

  ```
  Scenario: Ownership rules visible in code
    Tool: Bash (grep)
    Steps:
      1. target file에서 viewport/overflow 관련 주석 또는 구조 확인
    Expected Result: future maintainer가 scroll ownership을 이해할 수 있음
  ```

- [ ] 5. File Browser State Full-Height화

  **What to do**:
  - browser 상태에서 좌측만 작게 보이고 우측이 비는 현상을 제거한다
  - browser list pane / secondary empty pane 또는 help pane의 공간 분배를 재설계한다
  - 최소한 전체 workspace body를 쓰도록 만든다

  **Must NOT do**:
  - 파일 브라우저가 content width만 차지하는 구조 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F2,F3
  - **Blocked By**: 1,4

  **References**:
  - `apps/web/src/features/cloud-import/components/cloud-import-inline.tsx`
  - existing file browser subcomponents in cloud import hooks/components

  **Acceptance Criteria**:
  - [ ] browser 상태에서 workspace body 전체 폭을 활용한다
  - [ ] 긴 폴더 목록은 내부 list pane에서 스크롤된다

  **QA Scenarios**:

  ```
  Scenario: Browser uses full workspace
    Tool: Playwright
    Steps:
      1. import mode 진입 후 file browser 상태 유지
      2. left pane, right pane, empty area 크기 측정
    Expected Result: 검은 빈 대영역이 남지 않음
  ```

- [ ] 6. PDF Preview State Full-Height화

  **What to do**:
  - PDF 미리보기가 좁은 카드처럼 남는 현상 제거
  - PDF viewport를 shell body 안에서 크게 사용하고, analysis/actions는 별도 영역으로 유지한다

  **Must NOT do**:
  - PDF 미리보기를 content intrinsic size에 맡기지 말 것

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F2,F3
  - **Blocked By**: 1,4

  **References**:
  - PDF preview block inside `cloud-import-inline.tsx`

  **Acceptance Criteria**:
  - [ ] PDF 상태에서 preview viewport가 full-height body를 차지한다
  - [ ] 긴 문서는 preview pane 내부 스크롤로 탐색한다

  **QA Scenarios**:

  ```
  Scenario: PDF preview internal scroll
    Tool: Playwright
    Steps:
      1. PDF 파일 선택
      2. preview pane 내부 wheel scroll 수행
    Expected Result: PDF pane만 스크롤되고 page는 고정
  ```

- [ ] 7. XLSX Preview State Full-Height화

  **What to do**:
  - 대형 XLSX table preview를 workspace body 기준으로 배치한다
  - table viewport는 내부 가로/세로 scroll을 가진다
  - action 영역이 table 아래 빈 공간으로 밀리지 않게 분리한다

  **Must NOT do**:
  - large table 때문에 page가 확장되거나 action button이 맨 아래로 밀리는 구조 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F2,F3
  - **Blocked By**: 1,4

  **References**:
  - XLSX preview/table container in `cloud-import-inline.tsx` and preview component

  **Acceptance Criteria**:
  - [ ] 대형 XLSX가 viewport 안에서 잘리고 내부 scroll로 탐색된다
  - [ ] analyze CTA / analysis panel은 고정된 별도 영역에 남는다

  **QA Scenarios**:

  ```
  Scenario: Large XLSX stays inside viewport
    Tool: Playwright
    Steps:
      1. 큰 XLSX 업로드
      2. table viewport height/width 측정
      3. horizontal + vertical scroll 수행
    Expected Result: table pane 내부 scroll만 동작, action 영역 위치 안정적
  ```

- [ ] 8. Analysis/Editor Panel Fixed Action + Scroll Body 재구성

  **What to do**:
  - 분석 결과, 수정 요청, 가져오기 CTA를 하나의 fixed-bottom action zone 또는 stable side/bottom zone으로 정리한다
  - 긴 분석 결과는 editor body 내부에서만 스크롤되게 한다

  **Must NOT do**:
  - CTA가 content 아래 멀리 떨어지는 구조 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F2,F3
  - **Blocked By**: 1,4

  **References**:
  - `apps/web/src/features/cloud-import/components/import-right-panel.tsx`

  **Acceptance Criteria**:
  - [ ] 분석 결과 body는 내부 scroll을 가진다
  - [ ] CTA / 입력창 / 하단 액션은 viewport 안에 안정적으로 유지된다

  **QA Scenarios**:

  ```
  Scenario: Long analysis does not push CTA away
    Tool: Playwright
    Steps:
      1. 분석 결과를 긴 상태로 준비
      2. 결과 body 스크롤
      3. CTA/입력창 위치 확인
    Expected Result: CTA는 고정 영역에 남고 body만 스크롤
  ```

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
      fullscreen shell, hidden chrome, viewport-fixed, internal-scroll 규칙이 실제 구현과 일치하는지 검증

- [ ] F2. **Visual Workspace QA** — `unspecified-high`
      browser / PDF / XLSX / analysis 상태 각각에서 공간 낭비와 blank region 여부 검증

- [ ] F3. **Scroll Regression QA** — `unspecified-high`
      body scroll vs panel scroll ownership이 깨지지 않았는지 검증

- [ ] F4. **Scope Fidelity Check** — `deep`
      import workspace 범위만 건드렸는지, student-management 일반 flow를 과도하게 훼손하지 않았는지 검증

---

## Commit Strategy

- `feat(import-workspace): 외부 가져오기 화면을 fullscreen 고정 뷰포트 워크스페이스로 재구성`

---

## Success Criteria

### Verification Commands

```bash
pnpm --filter @yeon/web exec eslint <changed-files>
pnpm --filter @yeon/web exec prettier --check <changed-files>
pnpm --filter @yeon/web typecheck
pnpm --filter @yeon/web build
```

### Final Checklist

- [ ] import mode에서 기존 chrome이 사라진다
- [ ] viewport는 고정된다
- [ ] page-level scroll이 없다
- [ ] browser/PDF/XLSX/analysis 각각에서 내부 scroll만 사용한다
- [ ] blank unused region이 제거된다
