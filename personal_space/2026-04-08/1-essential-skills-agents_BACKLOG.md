# 1차: 프로젝트 필수 스킬·에이전트 구축

## 배경

현재 `.claude/skills/`와 `.claude/agents/`에 아키텍처·설계 중심 문서는 갖춰져 있지만,
일상 개발 워크플로우를 자동화·강제하는 실행형 스킬과 품질 유지관리 에이전트가 없다.

사용자 요청:
1. 코드 품질 유지관리자 에이전트 — 매 작업 시 작업자와 함께 실행
2. 프로젝트에 필수적인 스킬과 에이전트 전반

## 작업내용

### 에이전트 (신규)
1. **code-quality-guardian** — 모든 코드 작업 시 자동 동반. 상태 정합성, import 경계, cleanup, race condition, CSS Modules 제약, source of truth 위반을 실시간 감시
2. orchestrator 업데이트 — code-quality-guardian을 항상 동반하도록 명시
3. AGENTS.md 업데이트 — "항상 수행" 섹션에 품질 가디언 동반 규칙 추가

### 스킬 (신규)
1. **validate** — lint → format → typecheck → build 검증 파이프라인 즉시 참조용
2. **ship** — 검증 → 커밋 → push → PR → develop 머지 일사천리 플로우
3. **code-review** — critical/major/minor 구조화 리뷰 절차와 체크리스트

## 논의 필요
- 없음. 기존 AGENTS.md·CLAUDE.md 규칙을 스킬·에이전트 파일로 구체화하는 작업.

## 선택지
- A: 문서만 만들고 워크플로우 연동은 나중에 → 사문화 위험
- B: 문서 + orchestrator·AGENTS.md 연동까지 한 번에 → 즉시 적용

## 추천
B

## 사용자 방향
(추천 기준 진행)
