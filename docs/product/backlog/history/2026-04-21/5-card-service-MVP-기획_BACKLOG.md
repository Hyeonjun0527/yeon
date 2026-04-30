# card-service MVP 기획

## 배경

- `typing-service`에 이어 두 번째 "공개 학습 툴" 서비스로 `card-service`(플래시카드)를 추가한다.
- 핵심 유즈케이스
  1. 내가 덱(Deck)을 만든다.
  2. 내 덱 목록을 본다.
  3. 덱을 열어 카드를 추가/삭제/수정한다.
  4. 덱을 실행(play)해서 카드 앞면(질문) → 클릭 → 뒷면(답변) 뒤집기를 반복한다.
- 디자인은 `typing-service-home.tsx`와 동일한 톤(하얀 배경 `bg-white`, 본문 `text-[#111]`, 얇은 border `#e5e5e5`, `rounded-xl`, `#111` 솔리드 CTA).

## 참고 코드

- `apps/web/src/features/typing-service/typing-service-home.tsx` — 홈 레이아웃/톤 기준
- `apps/web/src/app/typing-service/page.tsx` — route shell + JSON-LD + metadata 패턴
- `apps/web/src/server/db/schema/spaces.ts`, `members.ts` — bigint identity PK + `publicId` + timestamp 표준 스키마 형태
- `apps/web/src/server/lib/public-id.ts` — `ID_PREFIX`, `<prefix>_<nanoid12>` 포맷 (새 prefix 추가 지점)
- `apps/web/src/app/api/v1/spaces/route.ts` — REST handler + `requireAuthenticatedUser` + `ServiceError` 패턴
- `packages/api-contract/src/spaces.ts` — zod request/response contract
- `docs/product/backlog/history/2026-04-21/4-DB-PK-bigint-마이그레이션_BACKLOG.md` — PK/publicId 규약 최종안

---

## 전체 범위 스냅샷

| 영역 | 내용 |
| --- | --- |
| 라우트 | `/card-service`, `/card-service/decks/[deckId]`, `/card-service/decks/[deckId]/play` |
| DB | `card_decks`, `card_deck_items` 2개 테이블 |
| API | `/api/v1/card-decks`, `/api/v1/card-decks/[deckPublicId]`, `/api/v1/card-decks/[deckPublicId]/items`, `/api/v1/card-decks/[deckPublicId]/items/[itemPublicId]` |
| 인증 | 로그인 필수(카카오/Google) — 덱은 개인 소유 자산 |
| 공유 | MVP: 개인 소유만. 스페이스 공유/공개 덱은 후속 |
| 디자인 | typing-service 동일 톤(하얀 백지, 깔끔) |

---

## 1차 — 기획/설계 확정 (본 문서)

### 작업내용
- 유즈케이스/스펙/디자인 방향을 차수별로 확정한다.
- 코드 수정 없음. 이 문서 리뷰 후 사용자 방향을 받아 2차부터 구현 시작.

### 논의 필요
1. **로그인 요구 여부**
2. **데이터 단위(개인 소유 vs 스페이스 공유)**
3. **카드 타입(텍스트만 vs 이미지/마크다운)**
4. **실행 모드(순차/랜덤/오답 반복)**
5. **테이블/prefix 네이밍**
6. **URL/route state 설계**
7. **카드 순서 재배치 UX**

### 선택지
- 아래 각 차수에서 항목별로 나열.

### 추천
- 아래 각 차수에서 항목별로 제시.

### 사용자 방향
- (비어 있으면 `추천` 기준으로 2차부터 진행)

---

## 2차 — DB 스키마 + API contract + 서버 엔드포인트

### 작업내용
- `apps/web/src/server/db/schema/card-decks.ts` 신설
- `apps/web/src/server/db/schema/card-deck-items.ts` 신설
- `apps/web/src/server/db/schema/index.ts`에 export 추가
- `apps/web/src/server/lib/public-id.ts` `ID_PREFIX`에 prefix 2개 추가
- `pnpm --filter @yeon/web db:generate --name=add_card_decks`로 마이그레이션 SQL 생성 → 멱등(idempotent) 패턴으로 손보고 같은 commit에 포함
- `packages/api-contract/src/card-decks.ts` 신설 (zod) — list/create/rename/delete deck, list/add/update/delete item
- `packages/api-contract/src/index.ts` re-export 추가
- `apps/web/src/server/repositories/card-decks-repository.ts`, `services/card-decks-service.ts` 신설 (CRUD + 소유권 검증)
- REST handler 4개 신설 (아래 URL 섹션 참고) — `requireAuthenticatedUser` + `ServiceError` 패턴 그대로
- 검증: `pnpm lint` → typecheck → `pnpm --filter @yeon/web db:check:drift` → `pnpm --filter @yeon/web build`

### 논의 필요
1. 테이블 네이밍
2. 외부 노출 prefix
3. 소유권 모델(유저 vs 스페이스)
4. 카드 아이템 순서 관리 방식

### 선택지

**(a) 테이블 네이밍**
- A1. `decks`, `cards` — 짧지만 `cards`가 너무 일반적이라 미래 충돌 위험
- A2. `card_decks`, `card_deck_items` — 서비스 네임스페이스 명확
- A3. `flashcard_decks`, `flashcards` — 도메인 용어는 선명하지만 길이 부담

**(b) publicId prefix**
- B1. `dck`(deck) + `dki`(deck item)
- B2. `deck` + `card` — 짧은 prefix 원칙과 충돌(기존은 3자)
- B3. `cdk`(card deck) + `cdi`(card deck item)

> 기존 `public-id.ts`는 이미 `crd`를 `counselingRecords`에 선점했다. `cards`/`card`는 피해야 혼동이 없다.

**(c) 소유권 모델**
- C1. **유저 소유**: `owner_user_id uuid → users.id` — 개인 학습 자산 관점, MVP에 적합
- C2. **스페이스 소유**: `space_id bigint → spaces.id` — 부트캠프 멤버 공유 가능하지만 혼자 쓰려면 스페이스부터 만들어야 해 진입 장벽 생김
- C3. 둘 다 지원 (nullable 각각) — MVP에 과함

**(d) 카드 순서 관리**
- D1. `position int` (정수 시퀀스) — 재배치 시 다수 행 갱신, 단순
- D2. `position numeric` 또는 fractional indexing — 재배치 시 한 행만 갱신, 복잡도↑
- D3. `created_at` 정렬 고정 — 순서 재배치 불가, MVP는 충분히 OK

### 추천
- (a) **A2 (`card_decks`, `card_deck_items`)** — 서비스 스코프 명확, `cards`라는 흔한 이름 선점 회피
- (b) **B1 (`dck` + `dki`)** — 3자 prefix 규칙과 정합, 기존 prefix와 충돌 없음
- (c) **C1 (유저 소유)** — MVP는 개인 자산. 공유는 후속 차수에 스페이스 링크 테이블로 확장
- (d) **D3 (created_at 고정 정렬)** — MVP는 재배치 없이 추가 순서대로. 재배치는 후속에서 `position int`로 올림

### 사용자 방향
- (비어 있음)

### 확정 스키마 초안 (추천안 기준)

```ts
// apps/web/src/server/db/schema/card-decks.ts
export const cardDecks = pgTable(
  "card_decks",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("card_decks_owner_created_at_idx").on(table.ownerUserId, table.createdAt),
  ],
);
```

```ts
// apps/web/src/server/db/schema/card-deck-items.ts
export const cardDeckItems = pgTable(
  "card_deck_items",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    deckId: bigint("deck_id", { mode: "bigint" })
      .notNull()
      .references(() => cardDecks.id, { onDelete: "cascade" }),
    frontText: text("front_text").notNull(),   // 앞면(질문)
    backText: text("back_text").notNull(),     // 뒷면(답변)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("card_deck_items_deck_created_at_idx").on(table.deckId, table.createdAt),
  ],
);
```

### REST 엔드포인트 (v1)

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| GET | `/api/v1/card-decks` | 내 덱 목록 (로그인 유저 소유) |
| POST | `/api/v1/card-decks` | 덱 생성 `{ title, description? }` |
| GET | `/api/v1/card-decks/[deckId]` | 덱 상세 + 카드 목록 |
| PATCH | `/api/v1/card-decks/[deckId]` | 덱 이름/설명 변경 |
| DELETE | `/api/v1/card-decks/[deckId]` | 덱 삭제 (카드 cascade) |
| POST | `/api/v1/card-decks/[deckId]/items` | 카드 추가 `{ frontText, backText }` |
| PATCH | `/api/v1/card-decks/[deckId]/items/[itemId]` | 카드 수정 |
| DELETE | `/api/v1/card-decks/[deckId]/items/[itemId]` | 카드 삭제 |

- 경로 파라미터는 모두 **publicId**(예: `dck_...`, `dki_...`). bigint는 응답에 절대 노출하지 않는다.
- 모든 엔드포인트 첫 줄에 `requireAuthenticatedUser` → 덱 `ownerUserId` 대조. 불일치면 `404` 반환(존재 유추 차단).

---

## 3차 — 덱 목록 + 생성 화면 (`/card-service`)

### 작업내용
- `apps/web/src/app/card-service/page.tsx` — route shell + metadata + JSON-LD (`SoftwareApplication` + `FAQPage` 생략 가능, typing-service와 동일 포맷만 유지)
- `apps/web/src/features/card-service/` feature 슬라이스 신설
  - `card-service-home.tsx` (조합 컴포넌트)
  - `hooks/use-deck-list.ts` (`useQuery`)
  - `hooks/use-create-deck.ts` (`useMutation`)
  - `components/deck-card.tsx`, `components/create-deck-dialog.tsx`, `components/empty-decks-screen.tsx`
- `ViewState` discriminated union으로 loading/error/empty/ready 분기 (`CLAUDE.md`의 Empty State 원칙 그대로)

### 논의 필요
1. 비로그인 접근 처리
2. 덱 생성 UX(인라인 vs 모달)

### 선택지

**(a) 비로그인 접근**
- A1. 비로그인 → 카카오 로그인 화면으로 자동 리다이렉트 (기존 counseling과 동일)
- A2. 비로그인 → "로그인 후 이용" 빈 화면 + 로그인 버튼 (덜 공격적)
- A3. 비로그인 → 로컬 덱 모드(로컬스토리지) — 타자연습 프로필 방식. 구현 복잡

**(b) 덱 생성 UX**
- B1. 우측 상단 "새 덱" 버튼 → 모달에서 title/description 입력 → 생성 후 목록 즉시 갱신
- B2. 상단에 항상 노출된 인라인 입력폼 → 즉시 생성
- B3. 상세 화면으로 이동시키며 생성(풀스크린 폼)

### 추천
- (a) **A2 (빈 화면 + 로그인 버튼)** — 첫 진입을 부드럽게. typing-service처럼 공개 툴 느낌 유지
- (b) **B1 (모달)** — 목록 컨텍스트 유지, 생성 흐름 가벼움

### 디자인 기준 (typing-service 재활용)

- 상단 헤더: `border-b border-[#e5e5e5]`, 앱명 + 우측에 "설정" 버튼 자리만 (이번 차수 기능 없음)
- 본문: `max-w-[1400px]`, 좌측 제목 "내 덱", 우측 상단 `새 덱` 버튼 (`bg-[#111] text-white rounded-xl px-4 py-2`)
- 덱 카드: `rounded-xl border border-[#e5e5e5] p-5`, 호버 시 `border-[#111]` 정도의 미세 변화
- 덱 카드 내용: 제목 `text-[16px] font-semibold`, 설명 `text-[13px] text-[#666]`, 하단 `카드 n장 · 업데이트 날짜` 메타
- Empty: 중앙 정렬 일러스트 없이 텍스트 2줄 + CTA ("첫 덱을 만들어보세요")

### 사용자 방향
- (비어 있음)

---

## 4차 — 덱 상세 + 카드 CRUD (`/card-service/decks/[deckId]`)

### 작업내용
- `apps/web/src/app/card-service/decks/[deckId]/page.tsx`
- `features/card-service/deck-detail-screen.tsx`
- `hooks/use-deck-detail.ts`, `hooks/use-add-card.ts`, `hooks/use-update-card.ts`, `hooks/use-delete-card.ts`, `hooks/use-rename-deck.ts`, `hooks/use-delete-deck.ts`
- 헤더에 덱 제목(인라인 편집 가능) + "실행" 버튼 → `/card-service/decks/[deckId]/play`
- 본문: 좌측 카드 리스트 / 우측(또는 하단) 카드 추가 폼. 모바일은 세로 스택
- 각 카드 행: 앞면 요약 + 뒷면 요약 2열, 편집/삭제 아이콘 버튼

### 논의 필요
1. 카드 추가 UX
2. 앞/뒷면 입력 form 형태
3. 위험 액션(덱 삭제) 확인 UX

### 선택지

**(a) 카드 추가 UX**
- A1. 하단/사이드에 항상 열린 `앞면·뒷면` 2칸 폼 + `추가` 버튼. 추가 후 폼 초기화
- A2. "카드 추가" 버튼 → 모달
- A3. 빈 행을 리스트 맨 아래에 고정 추가(스프레드시트 느낌)

**(b) 입력 form**
- B1. textarea 2개, plain text, 2KB 제한
- B2. 마크다운 허용
- B3. 마크다운 + 이미지 업로드

**(c) 덱 삭제 확인**
- C1. 제목 재입력 확인
- C2. 체크박스 + 빨간 버튼
- C3. 단순 confirm dialog

### 추천
- (a) **A1 (항상 열린 폼)** — 빠른 연속 추가 UX, 덱 채우기 속도 중요
- (b) **B1 (plain text 2KB)** — MVP. 마크다운은 후속 차수
- (c) **C1 (제목 재입력)** — 되돌릴 수 없는 파괴적 액션은 재입력 확인. 타자서비스 톤과도 어울림

### Route state contract
- `deckId` = publicId (URL source of truth, reload-safe)
- 인라인 편집 중 여부, 폼 입력값 = ephemeral UI (memory)
- 추가 중인 카드 draft는 로컬 memory만 (서버 draft 불필요)

### 사용자 방향
- (비어 있음)

---

## 5차 — 덱 실행/플립 화면 (`/card-service/decks/[deckId]/play`)

### 작업내용
- `apps/web/src/app/card-service/decks/[deckId]/play/page.tsx`
- `features/card-service/deck-play-screen.tsx`
- 카드 하나를 큰 카드로 중앙 표시 → 클릭하면 앞면↔뒷면 flip 애니메이션
- 상단 진행 표시: `3 / 12`, 이전/다음 버튼
- 카드 섞기 토글(우상단), 처음으로 돌아가기
- 카드가 0장인 덱이면 "카드를 먼저 추가하세요" 메시지 + 상세로 돌아가는 CTA

### 논의 필요
1. 플립 트리거(클릭 영역/키보드)
2. 인덱스 URL 동기화 여부
3. 진행 모드

### 선택지

**(a) 플립 트리거**
- A1. 카드 영역 전체 클릭 + `Space`/`Enter`
- A2. 카드 영역 클릭만
- A3. 전용 "뒤집기" 버튼만

**(b) 인덱스 URL 동기화**
- B1. URL 쿼리 `?i=3` — 새로고침/공유 가능 (reload-safe)
- B2. 메모리만 — 단순. 새로고침 시 처음부터
- B3. sessionStorage에 캐시

**(c) 진행 모드**
- C1. 순차만 (MVP)
- C2. 순차 + 섞기 토글 (한 세션 내 셔플)
- C3. 오답 반복(SRS 초기판)

### 추천
- (a) **A1 (카드 클릭 + Space/Enter)** — 학습 몰입도 기준, 키보드까지 지원
- (b) **B1 (URL `?i=3`)** — notepad 원칙(reload-safe는 URL) 준수. 플립 상태는 ephemeral
- (c) **C2 (순차 + 섞기 토글)** — MVP에서 딱 추가할 가치 있음. 오답 반복은 후속

### 디자인
- 중앙 카드: `w-full max-w-[720px] aspect-[3/2] rounded-2xl border border-[#e5e5e5] flex items-center justify-center text-[24px] leading-relaxed p-12 cursor-pointer`
- 플립: CSS 3D transform (`transform-style: preserve-3d`, `backface-visibility: hidden`)
- 하단 컨트롤: 왼쪽 이전(`←`) / 가운데 `3 / 12` / 오른쪽 다음(`→`) — 모두 얇은 border 버튼
- 상단 헤더: 좌측 덱 제목(작게) + 우측 섞기 토글 + 종료(`✕` → 상세로)

### 사용자 방향
- (비어 있음)

---

## 6차(후속, 이번 범위 밖) — 아이디어 목록

- 카드 순서 재배치(드래그 or 화살표) → `position int` 컬럼 추가 마이그레이션
- 스페이스 공유 덱(`card_deck_space_links` 링크 테이블)
- 마크다운/이미지 지원 (`content_type` + 업로드 스토리지)
- 학습 기록(세션별 정답률/진행) + 오답 반복(SRS)
- 공개 덱 갤러리 + SEO 페이지
- import/export (CSV, Anki)

---

## 검증 체크리스트 (차수별 공통)

1. `pnpm lint` / format
2. typecheck
3. `pnpm --filter @yeon/web db:check:drift` (DB 변경 차수)
4. `pnpm --filter @yeon/web build` — 반드시
5. 커밋 직전 `git status --short | grep "^??"`로 untracked 확인
6. 마이그레이션 SQL은 멱등 패턴(`IF NOT EXISTS`, `duplicate_object` + `duplicate_table` 예외) 적용

## 운영 주의

- 마이그레이션 머지 직후 develop 자동 배포 파이프라인이 `scripts/migrate.sh`로 운영 DB에 적용된다. 머지 전 운영 DB 상태가 로컬/스테이징과 동일한지 점검 (`feedback-db-migration-workflow.md` 규약).
- publicId prefix 추가는 `ID_PREFIX`에만 추가하고, `public-id.ts`의 파싱/검증은 공용 로직을 그대로 쓴다.
