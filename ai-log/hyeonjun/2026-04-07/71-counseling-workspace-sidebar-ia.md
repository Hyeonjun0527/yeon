# 상담 기록 워크스페이스 좌측 영역 IA 단순화

## 목적

- [60-counseling-workspace-ui-state-map.md](/home/osuma/coding_stuffs/yeon/personal_space/2026-04-07/60-counseling-workspace-ui-state-map.md)와 [65-counseling-workspace-empty-state-shell.md](/home/osuma/coding_stuffs/yeon/personal_space/2026-04-07/65-counseling-workspace-empty-state-shell.md) 기준으로, 좌측 패널이 `새 기록 만들기`와 `기존 기록 찾기` 두 역할만 읽히게 정보 구조를 다시 고정한다.
- 이번 차수의 핵심은 `사이드바를 더 풍부하게 만드는 것`이 아니라, `역할 수를 줄여 바로 이해되게 만드는 것`이다.
- 구현 단계에서는 이 문서를 기준으로 좌측 패널의 섹션 구성, 제목, 보조 도구 위치, 제거 대상을 맞춘다.

## 현재 문제

## 코드 기준

- 좌측 영역 안에 현재는 `업로드 카드/접힌 버튼`, `탐색 헤더`, `수치 요약`, `검색`, `필터`, `기록 리스트`가 모두 같은 레벨의 형제로 붙어 있다.
  - `counseling-record-workspace.tsx:1549-1888`
- `새 상담 기록`, `녹음 또는 업로드`, `상담 음성 기록`, `기록 탐색기`처럼 제목이 여러 겹으로 반복된다.
  - `counseling-record-workspace.tsx:1553-1567`
  - `counseling-record-workspace.tsx:1756-1764`
- `전체 n건`, `원문 준비 n건` 수치 요약이 탐색 헤더 바로 아래에서 강하게 보인다.
  - `counseling-record-workspace.tsx:1764-1768`
- 검색창과 필터칩이 리스트와 비슷한 무게로 상시 노출돼, 실제로는 `기록 선택`보다 `조정 도구`가 먼저 보인다.
  - `counseling-record-workspace.tsx:1770-1800`
- CSS도 `.sidebar` 안에 5개 row를 고정해 두고 있어, 역할보다 블록 수가 먼저 느껴진다.
  - `counseling-record-workspace.module.css:172-176`

## 왜 답답하게 느껴지는가

- 사용자는 좌측에서 사실 두 가지밖에 하지 않는다.
- `새 기록 만들기`
- `기존 기록 선택하기`
- 그런데 현재 UI는 이 두 행동을 `카드`, `헤더`, `칩`, `검색`, `필터`, `목록`으로 잘게 쪼개서 보여준다.
- 그래서 정리된 워크스페이스가 아니라, 옵션이 많은 관리 화면처럼 읽힌다.

## 최종 결정

## 선택

- 백로그 추천안 `A. 짧은 섹션 타이틀 유지`를 채택한다.

## 이유

- 좌측 영역은 역할 전환이 잦다.
- `간격만으로 구분`하면 첫 진입이나 기록 0건 상태에서 구조가 흐려질 수 있다.
- 대신 제목은 짧고 드라이하게 유지해야 한다.
- 즉, 제목은 남기되 `헤더 카드`처럼 보이면 안 된다.

## 최종 섹션 이름

- 생성 영역: `새 기록 만들기`
- 탐색 영역: `기록 찾기`

## 비추천 제목

- `녹음 또는 업로드`
- `상담 음성 기록`
- `기록 탐색기`
- `상담 관리`

## 좌측 영역 역할 재정의

### 지금까지

- 기능 덩어리의 모음

### 앞으로

- 위: 시작점
- 아래: 탐색점

## 최종 IA

```text
좌측 패널
  1. 새 기록 만들기
  2. 기록 찾기
```

## 각 섹션의 책임

## 1. 새 기록 만들기

### 역할

- 업로드/녹음 시작
- 선택 오디오 확인
- 최소 입력과 저장

### 포함 요소

- CTA 또는 접힌 생성 입구
- 선택 오디오 카드
- 학생 이름
- 추가 정보 디스클로저
- 저장 버튼

### 포함하면 안 되는 것

- 기록 수 요약
- 검색
- 필터
- 목록 헤더

## 2. 기록 찾기

### 역할

- 기존 기록 탐색
- 검색
- 필터 진입
- 기록 선택

### 포함 요소

- 짧은 섹션 제목
- 약한 보조 도구 줄
- 기록 리스트

### 포함하면 안 되는 것

- 생성용 설명문
- 업로드 제한 문구
- 강한 수치 칩 2개

## 상태별 좌측 구성

## 상태 1. 기록 0건 / 첫 진입

### 노출

- `새 기록 만들기`
- 대형 CTA 2개

### 숨김

- `기록 찾기` 섹션 전체
- 검색
- 필터
- 리스트 empty box

### 이유

- 없는 목록을 굳이 섹션으로 보여주면 또 빈 박스 하나가 생긴다.

## 상태 2. 생성 중 / 저장 전

### 노출

- `새 기록 만들기` 확장 상태
- 오디오 확인/저장 흐름
- 기록이 이미 있을 때만 아래에 `기록 찾기`

### 규칙

- 생성 섹션이 주인공
- 탐색 섹션은 존재하더라도 한 단계 약하게 보여야 한다

## 상태 3. 기록 있음 / 미선택

### 노출

- 상단: 접힌 `새 기록 만들기`
- 하단: `기록 찾기` + 리스트

### 규칙

- 이 상태의 좌측 질문은 `새로 만들까, 기존 것을 열까`다.
- 둘 다 보여주되 탐색 리스트가 시선의 중심이 된다.

## 상태 4. 기록 선택 후

### 노출

- 상단: 접힌 `새 기록 만들기`
- 하단: `기록 찾기` + 리스트

### 규칙

- 중앙 원문이 주인공이므로 좌측은 조용해야 한다.
- 선택 상태는 리스트 아이템에서만 분명히 보이면 충분하다.

## 구조 규칙

## 전체 순서

```text
aside.sidebar
  section.createSection
  section.browseSection
```

## createSection

- 별도 설명 카드 위에 다시 헤더를 얹지 않는다
- 섹션 제목은 create panel header 안에서 해결한다
- 접힌 상태에서도 `새 기록 만들기`라는 역할이 유지돼야 한다

## browseSection

- `기록 찾기` 제목
- 약한 도구 줄
- 기록 리스트

## 보조 도구 줄 규칙

- 검색과 필터는 browseSection 안에 묶인다
- 제목과 같은 레벨의 큰 헤더 블록으로 두지 않는다
- 수치 요약은 도구 줄 아래 small text 수준으로만 남길 수 있다

## 제거 대상

- `.sidebarHeader`의 이중 제목 구조
- `.sidebarSummary`의 강한 pill 요약
- 생성/탐색 사이를 또 다른 카드 헤더로 나누는 방식
- 리스트 empty state를 별도 큰 dashed box로 만드는 방식

## 유지하되 약화할 것

- 검색창
- 필터 진입점
- 전체 기록 수

## 탐색 헤더 처리

## 현재

```text
상담 음성 기록
기록 탐색기
[전체 n건] [원문 준비 n건]
```

## 변경

```text
기록 찾기
기록 12건
```

## 원칙

- eyebrow 제거
- 제목은 1개만
- 수치는 칩이 아니라 작은 텍스트로 약화

## 기록 리스트 역할 정리

## 지금까지

- 탐색 대상 + 설명 정보 + 태그 집합

## 앞으로

- 선택 가능한 문서 목록

## 의미

- 리스트 자체가 browseSection의 본문이다.
- 헤더가 커지면 리스트가 묻는다.
- 따라서 탐색 섹션은 제목보다 리스트가 먼저 읽히게 해야 한다.

## 시각 규칙

## 섹션 간격

- createSection과 browseSection 사이는 `24-28px`
- 보더보다 간격으로 나눈다

## 섹션 제목

- 16-18px / 700
- `sectionEyebrow` 없이 단독 사용
- 카드 배경 없음

## browse tools

- 검색은 full width 가능
- 필터는 다음 차수에서 더 약화하거나 토글 뒤로 숨긴다
- 현재 차수에서는 최소한 제목보다 강하게 보이면 안 된다

## record list

- 이 영역만 스크롤 허용
- 상단 도구 줄과 시각적으로 붙되, 카드처럼 또 감싸지 않는다

## 접근성/상태 규칙

- 색만으로 create/browse 상태를 구분하지 않는다
- 선택된 기록은 리스트 아이템의 텍스트/배지/배경으로 함께 표현한다
- 섹션 제목은 heading 역할을 가지게 해도 된다

## 마크업 방향

```tsx
<aside className={styles.sidebar}>
  <section className={styles.createSection}>
    <h2 className={styles.sidebarSectionTitle}>새 기록 만들기</h2>
    <CreateRecordPanel />
  </section>

  {records.length > 0 ? (
    <section className={styles.browseSection}>
      <div className={styles.browseSectionHeader}>
        <h2 className={styles.sidebarSectionTitle}>기록 찾기</h2>
        <p className={styles.browseCount}>기록 {records.length}건</p>
      </div>

      <div className={styles.browseTools}>
        <SearchField />
        <FilterTrigger />
      </div>

      <RecordList />
    </section>
  ) : null}
</aside>
```

## 권장 CSS 분리

- `.createSection`
- `.browseSection`
- `.sidebarSectionTitle`
- `.browseSectionHeader`
- `.browseCount`
- `.browseTools`

## 구현 메모

- 현재 `.sidebar`의 `grid-template-rows: auto auto auto auto minmax(0, 1fr)` 고정은 새 IA와 맞지 않는다.
- 섹션 단위 구조로 바꾸면 row 개수 대신 `gap`과 내부 section layout으로 제어하는 편이 맞다.
- `기록 찾기` 안의 검색/필터 강도는 14차에서 더 줄일 예정이므로, 이번 차수는 위치와 위계만 먼저 고정한다.

## 이번 차수의 완료 판단

- 좌측을 훑었을 때 `새 기록 만들기`, `기록 찾기` 두 역할만 먼저 읽히는지
- 기록 0건일 때 빈 탐색 섹션이 남지 않는지
- 수치 요약과 장식 헤더가 리스트보다 먼저 튀지 않는지
- 생성 도구와 탐색 도구가 같은 레벨의 박스 나열처럼 보이지 않는지
