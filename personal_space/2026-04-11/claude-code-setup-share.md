# 내 Claude Code 세팅 공유 (MCP + OMC + 스킬 풀셋)

---

## MCP 서버 구성

```
github         → PR/이슈/브랜치 CLI에서 직접 조작
context7       → 라이브러리 공식 문서 실시간 조회
exa            → 웹 검색 + 코드 컨텍스트 검색
filesystem     → 파일시스템 직접 접근
mariadb        → DB 쿼리 직접 실행
notion         → Notion 연동 (인증 필요)
Gmail          → 메일 연동 (claude.ai 앱 기반)
Google Calendar → 캘린더 연동 (claude.ai 앱 기반)
```

**실제로 제일 많이 쓰는 건 github + context7 + mariadb 세 개.**

`context7`은 진짜 신세계임. "이거 어떻게 해요?" 물어보면 학습 데이터 기준이 아니라 **지금 공식 docs 기준**으로 답해줌. SDK 버전 올릴 때 특히 유용.

`mariadb` MCP는 마이그레이션 확인할 때 Claude가 직접 쿼리 날려서 결과 보고 코드 짬. 개발 DB에만 연결하는 거 당연히 필수.

---

## oh-my-claudecode (OMC)

Claude Code 위에 올리는 멀티에이전트 오케스트레이션 레이어.

```bash
omc update  # 업데이트 명령어
```

### 주요 모드

| 모드 | 트리거 | 설명 |
|---|---|---|
| `autopilot` | "autopilot으로 해줘" | 아이디어 → 동작 코드까지 자율 실행 |
| `ralph` | "ralph로 해줘" | 완료 확인될 때까지 루프 반복 |
| `ultrawork` | "ulw" | 고처리량 병렬 실행 |
| `team` | `/team` | N개 에이전트 동시 협업 |

### 내장 에이전트 라우팅

Claude 혼자 하던 걸 역할별로 쪼갬:
- `executor` → 실제 코드 작성 (복잡한 건 opus 모델)
- `code-reviewer` → 리뷰 전담
- `verifier` → 완료 검증
- `architect` → 설계/분석 (읽기 전용)
- `Explore` → 코드베이스 탐색

---

## 프로젝트 커스텀 스킬

`.claude/skills/` 아래에 md 파일로 관리. 슬래시 커맨드로 호출.

```
/ship          → lint → typecheck → build → commit → push → PR → develop 머지 원스톱
/deploy-all    → ship + main 머지까지 전체 플로우
/validate      → lint → format → typecheck → build 검증만
/code-review   → critical/major/minor 구조화 리뷰
/design-eye,/frontend-design    → 10년차 디자이너 시각으로 UI 점검
/wrap          → 세션 마무리 (문서 업데이트 + TIL 추출)
/retrospective → 반복 수정 후 재발 방지 규칙 남기기
/clarify       → 의도 불명확할 때 객관식으로 정리
/session-insights → 과거 세션 패턴 분석
```

**패턴별 가이드 스킬도 따로 있음:**

```
/nextjs-patterns    → Next.js App Router 기준
/expo-patterns      → Expo 앱 구조 기준
/monorepo-patterns  → 모노레포 경계 관리 기준
/component-patterns → 컴포넌트 추상화 레벨
/git-pr-workflow    → 커밋/push/PR 운영 절차
```

---

## 외부 스킬팩

**`frontend-design:frontend-design`** — 10년차 디자이너/개발자 시각으로 프로덕션급 UI 설계해주는 전문 스킬. OMC 외부에서 별도로 설치.

---

## 꿀팁

**1. context7은 항상 켜두기**
공식 문서 기반으로 답해주니까 "이거 deprecated 됐나요?" 같은 질문도 정확함. Next.js, Prisma, Drizzle 쓰면 필수.

**2. `/ship` 하나로 배포까지**
lint 실패하면 멈추고, 통과하면 커밋→push→PR→머지까지 자동. 반복 작업 피로 제거.

**3. `/code-review` 는 직접 짠 코드에도**
PR 올리기 전에 한 번 돌려보면 내가 놓친 상태 오염 포인트 잡아줌. critical/major/minor 구조로 나와서 우선순위 판단하기 쉬움.

**4. `autopilot` + `ralph` 콤보**
autopilot으로 초안 만들고, 검증이 불안하면 ralph로 "빌드 통과할 때까지 루프"로 마무리.

**5. mariadb MCP는 개발 DB 전용으로**
Claude가 직접 SELECT 날리면서 데이터 확인하고 코드 짜는 게 훨씬 정확함. 프로덕션 DB는 절대 연결 금지.
