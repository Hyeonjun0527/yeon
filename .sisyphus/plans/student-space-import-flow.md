# 수강생 관리 스페이스 생성·가져오기 흐름 재설계 계획

## TL;DR

> **Quick Summary**: 수강생 관리 화면의 중복 CTA를 제거하고, `스페이스 만들기`를 부트캠프 운영 흐름에 맞는 외부 가져오기 중심 모달로 재설계한다.
>
> **Deliverables**:
>
> - 학생관리 화면 CTA 위계 재정렬
> - `스페이스 만들기` 모달 기반 2갈래 생성 흐름
> - Google Drive / OneDrive / 내 컴퓨터 기반 AI 가져오기 진입
> - 기존 Google Sheets 연동 UI의 차분한 업무툴형 재디자인
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: 정보구조 확정 → 생성 모달/상태모델 → 외부 가져오기 흐름 → 기존 시트 연동 통합 → 최종 검증

---

## Context

### Original Request

사용자는 학생관리 화면에서 중복된 버튼을 줄이고, 부트캠프 운영 현실에 맞게 `수강생 직접 추가`보다 `외부에서 가져오기` 중심으로 스페이스 생성 흐름을 재설계하길 원했다. 또한 현재 기능적으로는 동작하는 Google Sheets 연동 UI가 덜 세련되어 보여, 보다 점잖고 정돈된 업무툴 스타일로 개선하길 요청했다.

### Interview Summary

**Key Discussions**:

- 빈 상태의 `수강생 직접 추가`, `시트 연동 설정` CTA는 제거한다.
- 상단 `수강생 추가`는 유지하되, 스페이스 생성은 별도 흐름으로 분리한다.
- `시트 연동 설정`과 `스페이스 설정`의 역할 중복은 제거한다.
- `스페이스 만들기`는 즉시 생성이 아니라 모달을 띄워 선택하게 한다.
- 모달의 1차 선택지는 `빈 스페이스 만들기`와 `AI로 파일 가져와 스페이스 만들기`다.
- AI 가져오기는 `파일 선택 → AI 분석 → 초안/미리보기 검토 → 생성` 흐름을 따른다.
- 첫 버전 파일 범위는 엑셀/CSV로 제한한다.
- Google Drive / OneDrive는 실제 OAuth/파일 선택 흐름까지 포함한다.
- 기존 `수강생 데이터 연동하기` / `시트에서 가져오기` 역할은 새 생성 흐름으로 통합한다.
- 구글 시트 연동 영역은 기능은 유지하되, 시각적으로 더 차분한 업무툴형 톤으로 개편한다.

**Research Findings**:

- `apps/web/src/app/home/student-management/page.tsx`는 실제 본문으로 `StudentListScreen`만 렌더링한다.
- `apps/web/src/app/home/student-management/layout.tsx`가 스페이스 목록/선택/`스페이스 만들기` 트리거를 담당한다.
- `apps/web/src/features/student-management/screens/student-list-screen.tsx`가 상단 CTA와 빈 상태 CTA를 인라인으로 렌더링한다.
- 공용 `empty-state.tsx`가 존재하지만 핵심 학생관리 화면에서는 사용되지 않는다.
- 현재 `스페이스 만들기`는 사이드바 내부 인라인 생성 폼 기반이다.

### Metis Review

**Identified Gaps** (addressed):

- 기존 인라인 생성 UI를 완전히 대체해야 하는지 불명확 → 본 계획은 **모달 기반 흐름으로 완전 대체**를 기본값으로 둔다.
- Google Sheets 유지 범위가 애매함 → **기능은 유지, 노출 구조와 시각 표현만 새 흐름에 맞게 재배치**로 고정한다.
- 엣지 케이스 기준 부족 → OAuth 취소/권한 거부/손상 파일/빈 파일/중복 생성/분석 실패를 전부 QA 시나리오에 포함한다.
- 가져오기 스코프 확산 위험 → **비정형 문서(PDF/이미지), 다중 파일, 모바일 전용 최적화는 이번 범위에서 제외**한다.

---

## Work Objectives

### Core Objective

학생관리 화면의 스페이스 생성 경험을 “수동 생성” 중심에서 “외부 데이터 가져오기 기반 생성” 중심으로 전환하고, 중복 CTA 제거 및 구글 시트 연동 UI 정돈을 통해 부트캠프 운영자 관점의 업무 흐름을 명확히 만든다.

### Concrete Deliverables

- 학생관리 화면 CTA 구조 재정렬
- 빈 상태/상단 액션/사이드바 액션 간 역할 재정의
- `스페이스 만들기` 모달 및 2갈래 생성 흐름
- Drive/OneDrive/Local import 진입 및 AI 분석 단계 설계 반영
- 기존 시트 연동 UI를 새 생성 흐름에 맞춰 재배치

### Definition of Done

- [ ] 학생관리 메인 화면에서 중복 CTA가 제거되고 역할이 1회씩만 노출된다.
- [ ] `스페이스 만들기` 클릭 시 모달이 열리고 두 가지 생성 경로를 선택할 수 있다.
- [ ] AI 가져오기 흐름에서 Google Drive / OneDrive / 내 컴퓨터 옵션이 노출되고 각 상태 전이가 정상 동작한다.
- [ ] 기존 Google Sheets 관련 기능은 유지되면서도 새로운 정보구조 안에 정돈된 형태로 편입된다.

### Must Have

- 외부 가져오기 중심 정보구조
- 차분한 업무툴형 시각 톤
- 실제 OAuth/연결/취소/실패 상태 고려
- AI 분석 후 검토 단계 보장

### Must NOT Have (Guardrails)

- `수강생 직접 추가`를 빈 상태 메인 CTA로 재도입하지 않는다.
- `시트 연동 설정`과 `스페이스 설정` 같은 중복 역할 버튼을 다시 만들지 않는다.
- `스페이스 만들기`를 다시 즉시 생성형 버튼으로 되돌리지 않는다.
- PDF/이미지/OCR/다중 파일 같은 범위 확장을 이번 차수에 포함하지 않는다.
- 과한 마케팅성 강조/장식 UI로 흐름을 복잡하게 만들지 않는다.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: YES (프로젝트 검증 스크립트/빌드 체계 존재 가정, 실행 전 실제 package.json 확인)
- **Automated tests**: Tests-after
- **Framework**: workspace 실제 설정 기준
- **QA priority**: UI 흐름 + OAuth 상태 전이 + 기존 시트 기능 회귀 확인

### QA Policy

모든 작업은 에이전트 실행 QA 시나리오를 포함한다.
증거는 `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`에 저장한다.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (기반 정리 - 병렬 시작):

- T1. 현재 학생관리 CTA 정보구조/라벨/상태 소스 정리
- T2. 스페이스 생성 상태모델 및 모달 IA 설계 반영
- T3. 기존 시트/드라이브/업로드/OAuth 재사용 패턴 정리
- T4. 업무툴형 디자인 토큰/카드/CTA 톤 정리

Wave 2 (핵심 UI/상태 변경 - 최대 병렬):

- T5. 사이드바 `스페이스 만들기` 인라인 생성 제거 + 모달 트리거 전환
- T6. 상단 CTA/빈 상태 CTA 재구성
- T7. 생성 모달 1차 선택 화면 + 빈 스페이스 생성 경로 구현
- T8. AI 가져오기 소스 선택 화면 (Google Drive/OneDrive/내 컴퓨터)
- T9. 기존 Google Sheets 연동 영역 재배치/시각 개편

Wave 3 (통합 흐름):

- T10. Drive/OneDrive OAuth 및 파일 선택 상태 연결
- T11. 로컬 파일 업로드 + 엑셀/CSV 분석 시작 상태 연결
- T12. AI 분석 결과 초안/미리보기/확정 단계 연결
- T13. 생성 완료 후 스페이스 반영/리다이렉트/상태 동기화

Wave FINAL (검증):

- F1. Plan compliance audit
- F2. Code quality review
- F3. Real QA execution
- F4. Scope fidelity check

### Dependency Matrix

- T1: blocked by none → blocks T6, T9
- T2: blocked by none → blocks T5, T7, T12, T13
- T3: blocked by none → blocks T8, T9, T10, T11
- T4: blocked by none → blocks T6, T7, T8, T9
- T5: blocked by T2 → blocks T13
- T6: blocked by T1, T4 → blocks T13
- T7: blocked by T2, T4 → blocks T12, T13
- T8: blocked by T3, T4 → blocks T10, T11, T12
- T9: blocked by T1, T3, T4 → blocks T13
- T10: blocked by T3, T8 → blocks T12
- T11: blocked by T3, T8 → blocks T12
- T12: blocked by T2, T7, T8, T10/T11 → blocks T13
- T13: blocked by T2, T5, T6, T7, T9, T12 → blocks F1-F4

### Agent Dispatch Summary

- Wave 1: T1 `quick`, T2 `deep`, T3 `unspecified-high`, T4 `visual-engineering`
- Wave 2: T5 `quick`, T6 `visual-engineering`, T7 `visual-engineering`, T8 `unspecified-high`, T9 `visual-engineering`
- Wave 3: T10 `unspecified-high`, T11 `quick`, T12 `deep`, T13 `deep`
- Final: F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [ ] 1. 학생관리 CTA/상태 source of truth 정리

  **What to do**:
  - 학생관리 메인 화면에서 상단 CTA, 빈 상태 CTA, 사이드바 CTA가 각각 어떤 역할을 갖는지 정리한다.
  - 중복 역할(`시트 연동 설정` vs `스페이스 설정`, 빈 상태 직접추가 vs 상단 수강생추가)을 제거할 기준을 코드 구조에 반영한다.
  - 선택된 스페이스 유무에 따라 달라지는 CTA 노출 규칙을 명확히 정의한다.

  **Must NOT do**:
  - 새로운 버튼 역할을 임의로 추가하지 않는다.
  - `수강생 추가`의 기존 이동/행동 의미를 바꾸지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 라벨/분기 정리 중심의 국소 변경이다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `design-eye`: 시각 정리는 후속 디자인 작업에서 더 적합하다.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6, 9
  - **Blocked By**: None

  **References**:
  - `apps/web/src/features/student-management/screens/student-list-screen.tsx` - 상단 버튼과 빈 상태 CTA의 현재 역할과 분기를 확인하는 핵심 화면.
  - `apps/web/src/app/home/student-management/layout.tsx` - 사이드바 스페이스 생성 트리거와 스페이스 선택 컨텍스트가 있는 화면 골격.
  - `apps/web/src/features/student-management/components/empty-state.tsx` - 현재 미사용 공용 빈 상태 패턴을 비교해 재사용 여부를 판단할 수 있다.

  **Acceptance Criteria**:
  - [ ] 학생관리 메인 화면에서 CTA 역할 충돌이 제거된다.
  - [ ] 빈 상태에는 `수강생 직접 추가`, `시트 연동 설정`이 더 이상 노출되지 않는다.

  **QA Scenarios**:

  ```
  Scenario: 빈 상태 CTA 정리 확인
    Tool: Playwright
    Preconditions: 수강생 없는 스페이스 선택 상태
    Steps:
      1. `/home/student-management` 진입 후 빈 상태 렌더링 대기
      2. `.empty-state, main` 영역에서 CTA 텍스트 검색
      3. `수강생 직접 추가`, `시트 연동 설정` 미노출 확인
      4. 상단 영역에서 `수강생 추가` 버튼 1개만 존재하는지 확인
    Expected Result: 중복 CTA가 사라지고 상단 `수강생 추가`만 남는다.
    Failure Indicators: 제거 대상 CTA가 하나라도 보이거나 상단 버튼이 사라짐
    Evidence: .sisyphus/evidence/task-1-empty-cta-cleanup.png

  Scenario: 스페이스 선택 상태별 CTA 안정성 확인
    Tool: Playwright
    Preconditions: 스페이스 1개 이상 존재
    Steps:
      1. 스페이스 선택 상태와 미선택 상태를 각각 만든다.
      2. 각 상태에서 상단/사이드바 CTA 텍스트와 개수를 기록한다.
    Expected Result: 상태에 따라 의도된 CTA만 일관되게 노출된다.
    Evidence: .sisyphus/evidence/task-1-space-state-cta.json
  ```

  **Commit**: NO

- [ ] 2. 스페이스 생성 상태모델과 모달 정보구조 확정

  **What to do**:
  - 기존 인라인 생성 폼을 모달 기반 상태모델로 교체한다.
  - 생성 플로우를 `빈 스페이스`와 `AI 가져오기` 두 경로로 분리한다.
  - 분석 전/분석 중/분석 실패/초안 검토/생성 완료 상태를 정의한다.

  **Must NOT do**:
  - 상태를 screen-local 임시 boolean으로만 난립시키지 않는다.
  - 생성과 가져오기 흐름을 같은 CTA 아래 섞어버리지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 상태 전이와 흐름 설계가 핵심이다.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `design-eye`: 구조보다는 상태 경계 설계가 우선이다.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5, 7, 12, 13
  - **Blocked By**: None

  **References**:
  - `apps/web/src/app/home/student-management/layout.tsx` - 현재 인라인 생성 폼을 어떤 모달 트리거로 대체할지 판단하는 기준 파일.
  - `apps/web/src/features/student-management/screens/student-list-screen.tsx` - 생성 이후 메인 화면 상태 동기화가 어디와 연결되는지 보여준다.
  - `apps/web/src/app/home/_components/create-space-modal.tsx` - 기존 저장소 내 모달식 생성 패턴과 재사용 가능한 레이아웃/상태 방식을 확인할 수 있다.

  **Acceptance Criteria**:
  - [ ] `스페이스 만들기`는 모달을 연다.
  - [ ] 모달 첫 화면에 두 경로가 분명히 분리되어 보인다.
  - [ ] 실패/취소/닫기 시 중복 생성 없이 안전하게 복귀한다.

  **QA Scenarios**:

  ```
  Scenario: 스페이스 만들기 모달 진입
    Tool: Playwright
    Preconditions: 학생관리 화면 진입 완료
    Steps:
      1. 사이드바 `스페이스 만들기` 버튼 클릭
      2. 모달 루트가 열릴 때까지 대기
      3. `빈 스페이스 만들기`, `AI로 파일 가져와 스페이스 만들기` 옵션 존재 확인
    Expected Result: 인라인 폼 대신 선택 모달이 열린다.
    Evidence: .sisyphus/evidence/task-2-space-create-modal.png

  Scenario: 모달 취소 동작
    Tool: Playwright
    Preconditions: 생성 모달 열림
    Steps:
      1. ESC 또는 닫기 버튼 클릭
      2. 모달이 닫히고 사이드바 상태가 원복되는지 확인
    Expected Result: 폼 찌꺼기 상태 없이 안전하게 닫힌다.
    Evidence: .sisyphus/evidence/task-2-modal-cancel.png
  ```

  **Commit**: NO

- [ ] 3. 외부 연동/가져오기 재사용 패턴 정리

  **What to do**:
  - Google Sheets, Drive/OneDrive, 로컬 업로드, OAuth, 파일 선택 관련 기존 구현/서비스/API를 매핑한다.
  - 새 흐름에서 재사용할 부분과 신규 구현이 필요한 부분을 구분한다.
  - 토큰/연결 상태/source of truth 위치를 명확히 한다.

  **Must NOT do**:
  - 기존 동작을 확인하지 않고 OAuth 흐름을 새로 추측해 만들지 않는다.
  - 시트 관련 기능을 중복 구현하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 외부 연동 경계와 기존 구현 파악이 필요하다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8, 9, 10, 11
  - **Blocked By**: None

  **References**:
  - `apps/web/src/app/home/student-management/layout.tsx` - 기존 생성 진입점과 연결 지점을 확인한다.
  - `apps/web/src/features/student-management/screens/student-list-screen.tsx` - 현재 시트 관련 CTA가 메인 화면에서 어떻게 노출되는지 확인한다.
  - `CLAUDE.local.md` - 외부 연동 콜백 URI 규칙을 확인하는 운영 기준 문서다.

  **Acceptance Criteria**:
  - [ ] 재사용 가능한 기존 연동 경계와 신규 구현 필요 경계가 분리된다.
  - [ ] OAuth/파일 선택/업로드 source of truth 위치가 정리된다.

  **QA Scenarios**:

  ```
  Scenario: 기존 연동 경계 확인
    Tool: Bash (grep/read-based verification)
    Preconditions: 저장소 읽기 가능
    Steps:
      1. Drive/OneDrive/Sheets/OAuth 관련 파일 목록을 수집한다.
      2. 새 흐름이 기존 경계를 재사용하는지 diff로 확인한다.
    Expected Result: 중복 연동 구현 없이 기존 경계 위에 흐름이 얹힌다.
    Evidence: .sisyphus/evidence/task-3-integration-map.md

  Scenario: 콜백 경로 검증
    Tool: Bash
    Preconditions: 연동 설정 코드 존재
    Steps:
      1. 설정된 callback path가 CLAUDE.local.md 규칙과 일치하는지 확인
    Expected Result: 로컬/운영/dev 콜백 경로 정책과 충돌하지 않는다.
    Evidence: .sisyphus/evidence/task-3-oauth-callbacks.txt
  ```

  **Commit**: NO

- [ ] 4. 차분한 업무툴형 시각 톤 정리

  **What to do**:
  - 새 생성 모달, 시트 연동 카드, 상단 CTA가 같은 시각 위계를 따르도록 톤을 정리한다.
  - 과도한 배지/강조색/버튼 난립을 줄이고 설명-상태-행동의 순서를 명확히 한다.
  - 모바일 375px에서도 정보 구조가 무너지지 않게 기준을 잡는다.

  **Must NOT do**:
  - 화려한 마케팅형 카드 UI를 만들지 않는다.
  - 새 전역 CSS나 과한 토큰을 추가하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 시각 위계와 CTA 품질이 핵심이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6, 7, 8, 9
  - **Blocked By**: None

  **References**:
  - `.claude/skills/design-workflow.md` - 이 저장소 UI 작업 순서와 톤 정리 기준.
  - `.claude/skills/design-eye.md` - CTA 수, 위계, 업무툴형 톤 판단 기준.
  - `apps/web/src/features/student-management/screens/student-list-screen.tsx` - 현재 과한/중복 CTA가 집중된 실제 화면.

  **Acceptance Criteria**:
  - [ ] 주요 CTA는 화면당 1차 행동이 분명하다.
  - [ ] 설명 텍스트, 상태, 버튼 위계가 읽기 순서대로 정렬된다.

  **QA Scenarios**:

  ```
  Scenario: 디자인 위계 점검
    Tool: Playwright
    Preconditions: 학생관리 화면 로드 완료
    Steps:
      1. 데스크톱/모바일 viewport에서 화면 캡처
      2. CTA 개수와 시각 강조 수준 비교
    Expected Result: 상단/카드/모달의 강조 우선순위가 일관된다.
    Evidence: .sisyphus/evidence/task-4-visual-hierarchy.png

  Scenario: 모바일 위계 점검
    Tool: Playwright
    Preconditions: viewport 375px
    Steps:
      1. 모달/카드/상단 버튼이 겹치지 않는지 확인
    Expected Result: 모바일에서도 정보 순서와 터치 타겟이 유지된다.
    Evidence: .sisyphus/evidence/task-4-mobile-hierarchy.png
  ```

  **Commit**: NO

- [ ] 5. 사이드바 `스페이스 만들기`를 모달 트리거로 전환

  **What to do**:
  - 현재 인라인 생성 폼을 제거한다.
  - 사이드바 하단 CTA는 모달 열기 전용으로 단순화한다.
  - 모달 열림/닫힘 상태와 포커스 복귀를 정리한다.

  **Must NOT do**:
  - 인라인 생성 폼과 모달을 동시에 남기지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 13
  - **Blocked By**: 2

  **References**:
  - `apps/web/src/app/home/student-management/layout.tsx` - 실제 사이드바 버튼과 인라인 생성 폼이 있는 파일.
  - `apps/web/src/app/home/_components/create-space-modal.tsx` - 모달 기반 상호작용 패턴 참고.

  **Acceptance Criteria**:
  - [ ] 사이드바에서 인라인 생성 UI가 사라진다.
  - [ ] `스페이스 만들기` 클릭 시 모달만 열린다.

  **QA Scenarios**:

  ```
  Scenario: 사이드바 생성 트리거 전환
    Tool: Playwright
    Preconditions: 학생관리 화면 로드
    Steps:
      1. 사이드바 하단 `스페이스 만들기` 클릭
      2. 인라인 input/form 존재 여부 확인
      3. 모달 열림 확인
    Expected Result: 인라인 폼은 없고 모달만 열린다.
    Evidence: .sisyphus/evidence/task-5-sidebar-trigger.png

  Scenario: 포커스 복귀
    Tool: Playwright
    Preconditions: 모달 오픈 후 닫기
    Steps:
      1. ESC로 모달 닫기
      2. 포커스가 `스페이스 만들기` 버튼으로 돌아오는지 확인
    Expected Result: 접근성 흐름이 깨지지 않는다.
    Evidence: .sisyphus/evidence/task-5-focus-return.txt
  ```

  **Commit**: NO

- [ ] 6. 상단 CTA와 빈 상태 CTA 재구성

  **What to do**:
  - 상단에 `수강생 추가`와 `스페이스 설정`만 남기고 의미를 정리한다.
  - 빈 상태에서는 제거 대상 CTA를 없애고, 새 정보구조에 맞는 안내 문구만 남긴다.
  - 수강생 추가와 스페이스 생성의 책임을 화면 전반에서 분리한다.

  **Must NOT do**:
  - 스페이스 생성 관련 CTA를 빈 상태나 상단에 중복 재배치하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 13
  - **Blocked By**: 1, 4

  **References**:
  - `apps/web/src/features/student-management/screens/student-list-screen.tsx` - 상단 CTA와 빈 상태 콘텐츠가 함께 존재하는 핵심 파일.
  - `.claude/skills/design-eye.md` - CTA 위계와 설명 문구 톤 정리 기준.

  **Acceptance Criteria**:
  - [ ] 상단 CTA는 역할이 중복되지 않는다.
  - [ ] 빈 상태는 설명 중심으로 단순화된다.

  **QA Scenarios**:

  ```
  Scenario: 상단 CTA 개수/역할 검증
    Tool: Playwright
    Preconditions: 학생관리 화면 로드
    Steps:
      1. 상단 우측 버튼 텍스트 수집
      2. `스페이스 설정`, `수강생 추가`만 남는지 확인
    Expected Result: 중복 없는 2개 역할만 노출된다.
    Evidence: .sisyphus/evidence/task-6-top-cta.png

  Scenario: 빈 상태 문구 정리 검증
    Tool: Playwright
    Preconditions: 빈 스페이스 선택
    Steps:
      1. 빈 상태 문구와 버튼 개수 캡처
    Expected Result: 행동 유도는 과하지 않고 안내 중심으로 정리된다.
    Evidence: .sisyphus/evidence/task-6-empty-state.png
  ```

  **Commit**: NO

- [ ] 7. 생성 모달 1차 선택 화면과 빈 스페이스 경로 구현

  **What to do**:
  - 모달 첫 화면에 두 선택지의 목적/차이를 명확히 표현한다.
  - `빈 스페이스 만들기` 경로는 최소 입력으로 빠르게 완료할 수 있게 한다.
  - 생성 성공 후 새 스페이스 선택 상태가 반영되게 연결한다.

  **Must NOT do**:
  - 빈 스페이스 경로에 외부 가져오기 관련 필드를 섞지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 12, 13
  - **Blocked By**: 2, 4

  **References**:
  - `apps/web/src/app/home/_components/create-space-modal.tsx` - 선택형 모달 구성 패턴 참고.
  - `apps/web/src/app/home/student-management/layout.tsx` - 생성 후 사이드바 선택 상태 연결 확인.

  **Acceptance Criteria**:
  - [ ] 모달 첫 화면에서 두 경로의 차이가 명확하다.
  - [ ] 빈 스페이스 생성은 최소 마찰로 완료된다.

  **QA Scenarios**:

  ```
  Scenario: 빈 스페이스 생성 성공
    Tool: Playwright
    Preconditions: 학생관리 화면 진입
    Steps:
      1. `스페이스 만들기` → `빈 스페이스 만들기` 선택
      2. 필수값 입력 후 생성
      3. 새 스페이스가 사이드바에 추가되고 선택되는지 확인
    Expected Result: 새 빈 스페이스가 즉시 활성화된다.
    Evidence: .sisyphus/evidence/task-7-empty-space-create.png

  Scenario: 빈 스페이스 생성 취소
    Tool: Playwright
    Preconditions: 빈 스페이스 생성 입력 중
    Steps:
      1. 닫기/취소 클릭
      2. 스페이스가 생성되지 않았는지 확인
    Expected Result: 부분 상태 없이 안전 취소된다.
    Evidence: .sisyphus/evidence/task-7-empty-space-cancel.png
  ```

  **Commit**: NO

- [ ] 8. AI 가져오기 소스 선택 화면 구현

  **What to do**:
  - 모달 내 `Google Drive`, `OneDrive`, `내 컴퓨터` 3개 소스를 카드/리스트 형태로 제공한다.
  - 각 소스별 준비 상태, 연결 상태, 다음 행동을 명확하게 보여준다.
  - 기존 시트 연동 기능과의 관계를 혼란 없이 설명한다.

  **Must NOT do**:
  - 소스 선택 화면에 실제 분석 결과/매핑 UI까지 한 화면에 몰아넣지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 10, 11, 12
  - **Blocked By**: 3, 4

  **References**:
  - `CLAUDE.local.md` - OAuth callback 규칙과 연동 범위 기준.
  - `apps/web/src/app/home/_components/create-space-modal.tsx` - 선택형 모달 정보 구조 참고.

  **Acceptance Criteria**:
  - [ ] 세 가지 소스가 모두 보인다.
  - [ ] 각 소스의 다음 행동이 텍스트로 명확하다.

  **QA Scenarios**:

  ```
  Scenario: 소스 선택 화면 검증
    Tool: Playwright
    Preconditions: 생성 모달 열림, AI 가져오기 선택
    Steps:
      1. 세 가지 소스 라벨과 설명 문구 확인
    Expected Result: `Google Drive`, `OneDrive`, `내 컴퓨터`가 모두 보인다.
    Evidence: .sisyphus/evidence/task-8-import-sources.png

  Scenario: 소스 전환 검증
    Tool: Playwright
    Preconditions: 소스 선택 화면 노출
    Steps:
      1. 각 소스를 차례로 클릭
      2. 다음 단계 버튼/설명 상태가 바뀌는지 확인
    Expected Result: 선택 소스가 명확히 구분된다.
    Evidence: .sisyphus/evidence/task-8-source-switch.png
  ```

  **Commit**: NO

- [ ] 9. 기존 Google Sheets 연동 영역을 새 생성 흐름에 통합

  **What to do**:
  - `수강생 데이터 연동하기`, `시트에서 가져오기` 중심의 기존 카드/CTA를 새 생성 흐름의 일부로 재배치한다.
  - 기능은 유지하되, 정보 구조는 “보조 연동”으로 정돈한다.
  - 시각적 톤을 차분한 업무툴형으로 개선한다.

  **Must NOT do**:
  - 기존 시트 기능을 삭제하거나 숨겨서 접근 불가능하게 만들지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 13
  - **Blocked By**: 1, 3, 4

  **References**:
  - `apps/web/src/features/student-management/screens/student-list-screen.tsx` - 기존 시트 연동 카드와 액션 위치 확인.
  - `.claude/skills/design-eye.md` - 업무툴형 톤으로 재정렬할 때 참고할 판단 기준.

  **Acceptance Criteria**:
  - [ ] 기존 시트 기능 진입은 유지된다.
  - [ ] 새 생성 흐름과 경쟁하지 않고 보조 역할로 정렬된다.

  **QA Scenarios**:

  ```
  Scenario: 시트 연동 접근성 유지
    Tool: Playwright
    Preconditions: 학생관리 화면 진입
    Steps:
      1. 시트 관련 진입점을 찾아 클릭
      2. 기존 기능 접근이 가능한지 확인
    Expected Result: 기능은 유지되지만 노출 구조는 정돈된다.
    Evidence: .sisyphus/evidence/task-9-sheet-access.png

  Scenario: 시각 톤 검증
    Tool: Playwright
    Preconditions: 시트 연동 카드 렌더링
    Steps:
      1. 카드 캡처
      2. 버튼 수/설명 수/강조색 밀도를 확인
    Expected Result: 이전보다 차분하고 읽기 쉬운 레이아웃이다.
    Evidence: .sisyphus/evidence/task-9-sheet-tone.png
  ```

  **Commit**: NO

- [ ] 10. Google Drive / OneDrive OAuth 및 파일 선택 상태 연결

  **What to do**:
  - Google Drive / OneDrive 각각의 연결, 권한 승인, 취소, 거부, 재시도 상태를 흐름에 연결한다.
  - 연결 후 선택 가능한 파일 리스트 또는 파일 선택 결과를 다음 단계와 연결한다.
  - 연결 실패 시 복구 동선을 명확히 제공한다.

  **Must NOT do**:
  - 토큰/연결 상태를 임시 UI state에만 두고 source of truth를 흐리게 만들지 않는다.
  - 권한 거부/취소 흐름을 누락하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 12
  - **Blocked By**: 3, 8

  **References**:
  - `CLAUDE.local.md` - OAuth callback 정책의 운영 기준.
  - 기존 연동 관련 구현 파일들(조사 결과 기준) - 실제 OAuth/파일선택 재사용 지점.

  **Acceptance Criteria**:
  - [ ] Google Drive / OneDrive 각각에서 연결 성공/실패/취소 상태가 처리된다.
  - [ ] 연결 후 선택 파일이 분석 단계로 전달된다.

  **QA Scenarios**:

  ```
  Scenario: Google Drive 연결 성공
    Tool: Playwright
    Preconditions: 테스트용 OAuth 계정 사용 가능
    Steps:
      1. AI 가져오기에서 `Google Drive` 선택
      2. OAuth 승인 완료
      3. 파일 1개 선택 후 다음 단계 진입
    Expected Result: 선택 파일 메타데이터가 분석 단계로 넘어간다.
    Evidence: .sisyphus/evidence/task-10-google-drive-success.png

  Scenario: OneDrive 권한 거부
    Tool: Playwright
    Preconditions: OAuth 창 열기 가능
    Steps:
      1. `OneDrive` 선택 후 권한 거부
      2. 오류 메시지와 재시도 CTA 확인
    Expected Result: 모달이 깨지지 않고 복구 CTA가 보인다.
    Evidence: .sisyphus/evidence/task-10-onedrive-denied.png
  ```

  **Commit**: NO

- [ ] 11. 내 컴퓨터 업로드와 엑셀/CSV 분석 시작 상태 연결

  **What to do**:
  - 로컬 파일 업로드는 단일 엑셀/CSV 기준으로 연결한다.
  - 손상 파일, 빈 파일, 형식 불일치 시 분석 전 단계에서 차단한다.
  - 업로드된 파일 메타데이터와 분석 요청 상태를 다음 화면과 연결한다.

  **Must NOT do**:
  - 다중 파일/폴더 업로드까지 범위를 넓히지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 12
  - **Blocked By**: 3, 8

  **References**:
  - 학생관리 생성 모달 관련 구현 파일들 - 로컬 업로드 UI가 연결될 위치.
  - 기존 파일 업로드 유틸/패턴(조사 결과 기준) - 파일 형식 검증 및 상태 전이 참고.

  **Acceptance Criteria**:
  - [ ] `.xlsx`, `.xls`, `.csv`가 허용된다.
  - [ ] 빈 파일/손상 파일/잘못된 형식은 명확한 에러로 차단된다.

  **QA Scenarios**:

  ```
  Scenario: CSV 업로드 성공
    Tool: Playwright
    Preconditions: 유효한 `students.csv` 준비
    Steps:
      1. `내 컴퓨터` 선택
      2. `students.csv` 업로드
      3. 분석 시작 단계 진입 확인
    Expected Result: 파일명이 표시되고 분석 단계로 이동한다.
    Evidence: .sisyphus/evidence/task-11-local-upload-success.png

  Scenario: 손상 파일 업로드 실패
    Tool: Playwright
    Preconditions: 잘못된 확장자 또는 빈 파일 준비
    Steps:
      1. 허용되지 않는 파일 업로드
      2. 오류 메시지 확인
    Expected Result: 분석 단계로 넘어가지 않고 오류가 보인다.
    Evidence: .sisyphus/evidence/task-11-local-upload-error.png
  ```

  **Commit**: NO

- [ ] 12. AI 분석 결과 초안/미리보기/확정 단계 연결

  **What to do**:
  - 선택된 파일이 분석되면 스페이스 초안, 예상 수강생 수, 핵심 필드 요약을 보여준다.
  - 사용자가 생성 전 결과를 검토/확정/취소할 수 있게 한다.
  - 분석 불확실 또는 실패 상태에서는 명확한 대안을 제공한다.

  **Must NOT do**:
  - 분석 결과를 확인 없이 즉시 생성으로 연결하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 13
  - **Blocked By**: 2, 7, 8, 10/11

  **References**:
  - `apps/web/src/app/home/_components/create-space-modal.tsx` - 단계형 모달/확정 UI 패턴 참고.
  - 학생관리 메인 화면 및 생성 상태 연결 파일 - 생성 후 결과를 반영할 위치.

  **Acceptance Criteria**:
  - [ ] 분석 결과 검토 단계가 존재한다.
  - [ ] 사용자는 생성 전 취소/뒤로가기/확정을 선택할 수 있다.
  - [ ] 분석 실패 시 복구 경로가 있다.

  **QA Scenarios**:

  ```
  Scenario: 분석 결과 검토 후 생성 확정
    Tool: Playwright
    Preconditions: 유효 파일 또는 연결 파일 준비
    Steps:
      1. 분석 완료 대기
      2. 초안 정보(스페이스명, 예상 수강생 수 등) 표시 확인
      3. `생성` 클릭
    Expected Result: 검토 단계를 거친 뒤에만 스페이스가 생성된다.
    Evidence: .sisyphus/evidence/task-12-analysis-preview.png

  Scenario: 분석 실패 복구
    Tool: Playwright
    Preconditions: 분석 실패를 유도하는 샘플 파일
    Steps:
      1. 분석 실패 상태 진입
      2. 재시도 또는 소스 재선택 CTA 확인
    Expected Result: 모달 흐름이 깨지지 않고 복구 선택지가 보인다.
    Evidence: .sisyphus/evidence/task-12-analysis-error.png
  ```

  **Commit**: NO

- [ ] 13. 생성 완료 후 스페이스 반영/리다이렉트/상태 동기화

  **What to do**:
  - 빈 스페이스/AI 생성 모두 완료 후 새 스페이스가 사이드바와 메인 상태에 즉시 반영되게 한다.
  - 모달 종료, 선택 스페이스 갱신, 관련 카드/빈 상태/목록 리프레시를 정리한다.
  - 기존 Google Sheets 보조 기능과 충돌하지 않도록 최종 통합한다.

  **Must NOT do**:
  - 생성 성공 후 새로고침 없이는 상태가 보이지 않는 구조를 남기지 않는다.
  - 생성 완료 후 이전 스페이스/빈 상태가 남는 거짓 상태를 허용하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: 2, 5, 6, 7, 9, 12

  **References**:
  - `apps/web/src/app/home/student-management/layout.tsx` - 사이드바 선택 상태/스페이스 목록 반영 위치.
  - `apps/web/src/features/student-management/screens/student-list-screen.tsx` - 메인 영역 빈 상태/카드/상단 행동이 최종적으로 갱신될 위치.

  **Acceptance Criteria**:
  - [ ] 생성 성공 직후 새 스페이스가 선택된 상태로 보인다.
  - [ ] 모달은 닫히고 메인 화면이 새 상태를 반영한다.
  - [ ] 거짓 빈 상태나 중복 생성이 남지 않는다.

  **QA Scenarios**:

  ```
  Scenario: 생성 완료 후 상태 동기화
    Tool: Playwright
    Preconditions: 빈 스페이스 또는 AI 생성 완료 직전
    Steps:
      1. 생성 완료
      2. 사이드바에 새 스페이스 추가 여부 확인
      3. 새 스페이스 자동 선택 여부 확인
      4. 메인 화면이 새 상태를 반영하는지 확인
    Expected Result: 새로고침 없이 UI 전체가 동기화된다.
    Evidence: .sisyphus/evidence/task-13-post-create-sync.png

  Scenario: 중복 생성 방지
    Tool: Playwright
    Preconditions: 생성 확인 버튼 노출
    Steps:
      1. 생성 버튼을 빠르게 2회 이상 클릭 시도
      2. 실제 스페이스가 1개만 생성되는지 확인
    Expected Result: 로딩 중 중복 제출이 차단된다.
    Evidence: .sisyphus/evidence/task-13-double-submit.txt
  ```

  **Commit**: YES
  - Message: `feat(student-management): 스페이스 생성 흐름을 외부 가져오기 중심 모달로 재설계`
  - Files: 학생관리 layout/screen/생성모달/연동 관련 파일
  - Pre-commit: 실제 workspace lint/typecheck/build 명령

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `unspecified-high`
- [ ] F4. **Scope Fidelity Check** — `deep`

---

## Commit Strategy

- 생성 흐름/CTA 재설계와 외부 가져오기 통합은 한 landing 단위로 관리하되, 실제 파일 수정 범위가 넓을 경우 작업 브랜치 안에서 의미 단위 커밋으로 나눈다.

## Success Criteria

### Verification Commands

```bash
pnpm --filter @yeon/web build
```

### Final Checklist

- [ ] 모든 Must Have 충족
- [ ] 모든 Must NOT Have 미충족 확인
- [ ] 주요 UI 흐름 회귀 없음
- [ ] 외부 가져오기 중심 정보구조가 명확함
