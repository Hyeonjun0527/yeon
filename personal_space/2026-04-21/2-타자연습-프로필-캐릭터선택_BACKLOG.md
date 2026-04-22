# 타자연습 프로필 + 캐릭터 선택 기획

작성일: 2026-04-21

---

## 배경

현재 `/typing-service` 홈은 난이도 탭(스타터/플로우/버스트) + 타자 연습 영역 + FAQ로 구성되어 있다.
이를 **프로필 카드 중심 구조**로 개편한다.

---

## 목표 흐름

```
/typing-service 진입
  → 프로필 카드 (캐릭터 애니메이션 + 닉네임/캐릭터 선택)
  → [레이스 입장] 버튼 (카드 바로 아래, 크게)
  → /typing-service/play 에서 선택한 캐릭터로 레이스
```

---

## 1차수: 홈 개편 + 로컬 프로필

### 작업 내용

**A. `/typing-service` 홈 개편**
- FAQ 섹션 제거
- 난이도 탭(스타터/플로우/버스트) 제거
- 타자 연습 영역 제거 (홈은 프로필 진입점만)
- 프로필 카드 중앙 배치
- 카드 하단에 "레이스 입장" 버튼 크게

**B. 프로필 카드 UI**
- 캐릭터 애니메이션 (Phaser 또는 Canvas 또는 CSS 스프라이트로 6프레임 루프)
- 닉네임 표시 + 인라인 편집
- 캐릭터 선택 UI (현재 보유 캐릭터 목록 아이콘 나열 → 클릭으로 전환)
- 프로필 변경 즉시 저장 (localStorage)

**C. 캐릭터 에셋 정의**
- 현재 보유: `camel-run` (낙타, 96×96 6프레임)
- 추가 확보 필요 → 2차수에서 처리
- 1차수에서는 낙타 1종만으로 동작, 선택 UI 뼈대만 구성

**D. 레이스 연동**
- `/typing-service/play` 진입 시 localStorage에서 프로필 읽음
- `local-player` 레인의 `label`을 닉네임으로, 캐릭터 스프라이트를 선택된 것으로 교체
- `mountTypingRaceEngine`에 `playerProfile` 옵션 추가

### 논의 필요

1. **프로필 저장 위치**: localStorage vs 서버 (로그인 연동)
2. **캐릭터 애니메이션 방식**: Phaser 미니 인스턴스 vs CSS sprite-sheet animation vs `<canvas>` 직접 구현
3. **닉네임 기본값**: "You" 고정 vs 랜덤 생성 vs 사용자 입력 유도

### 선택지

| 항목 | 옵션 A | 옵션 B |
|------|--------|--------|
| 프로필 저장 | localStorage (즉시 구현 가능) | 서버 DB (로그인 필요) |
| 카드 애니메이션 | CSS sprite-sheet (경량) | Phaser 미니 인스턴스 (기존 자산 재활용) |
| 닉네임 기본값 | "Guest" + 숫자 | 빈 값 → 입력 유도 |

### 추천

- 저장: **localStorage** (1차수, 서버 연동은 로그인 붙을 때)
- 애니메이션: **CSS sprite-sheet animation** — Phaser 로드 없이 가볍게 카드에서 재생 가능
- 닉네임: **"Guest"** 기본값, 클릭하면 인라인 편집

### 사용자 방향

> (비어 있으면 추천 기준으로 진행)

---

## 2차수: 캐릭터 에셋 추가 + 선택 UX 완성

### 작업 내용

- 추가 캐릭터 스프라이트 확보 (2~4종)
- 캐릭터 선택 UI: 썸네일 그리드 → 선택 하이라이트
- 레이스 내 캐릭터 반영: 선택된 스프라이트로 `local-player` 렌더
- 캐릭터별 레인 accent 색상 연동

### 논의 필요

- 캐릭터 에셋 출처: Piskel 직접 제작 vs 무료 공개 스프라이트 활용
- 캐릭터 종류 방향: 동물 계열 유지? 다양화?

---

## 화면 구조 스케치

```
┌─────────────────────────────────────────────────┐
│  타자연습                          (헤더)         │
├─────────────────────────────────────────────────┤
│                                                 │
│          ┌──────────────────────┐               │
│          │  [낙타 애니메이션]    │               │
│          │                      │               │
│          │  Guest  ✎            │               │
│          │  ◯ 낙타  ○ ???       │               │
│          └──────────────────────┘               │
│                                                 │
│          ┌──────────────────────┐               │
│          │     레이스 입장       │               │
│          └──────────────────────┘               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 파일 영향 범위 (1차수)

| 파일 | 변경 내용 |
|------|-----------|
| `apps/web/src/features/typing-service/typing-service-home.tsx` | 전면 개편 |
| `apps/web/src/features/typing-service/typing-race-play-screen.tsx` | 프로필 읽기 추가 |
| `packages/typing-race-engine/src/index.ts` | `playerProfile` 옵션 추가 |
| `apps/web/src/features/typing-service/typing-content.ts` | 변경 없음 |

신규 파일:
- `apps/web/src/features/typing-service/use-typing-profile.ts` — 프로필 localStorage 훅
- `apps/web/src/features/typing-service/typing-profile-card.tsx` — 프로필 카드 컴포넌트
