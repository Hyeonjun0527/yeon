# 상담 기록 워크스페이스 상단 헤더 슬림화 설계

## 목적

- 현재 상단 헤더는 설명문과 메트릭 카드가 먼저 보이면서 첫 행동을 가린다.
- 이번 차수에서는 헤더를 `정보 보드`에서 `문서 제목줄`로 바꾼다.
- 구현 단계에서는 이 문서를 기준으로 [counseling-record-workspace.tsx](/home/osuma/coding_stuffs/yeon/apps/web/src/features/counseling-record-workspace/counseling-record-workspace.tsx)와 [counseling-record-workspace.module.css](/home/osuma/coding_stuffs/yeon/apps/web/src/features/counseling-record-workspace/counseling-record-workspace.module.css)의 헤더를 정리한다.

## 현재 헤더 문제

## 코드 기준

- 제목 아래 설명문이 2줄 이상으로 길다.
  - `counseling-record-workspace.tsx:1510-1514`
- 우측 메트릭 3개가 강한 카드로 올라온다.
  - `counseling-record-workspace.tsx:1517-1531`
- 헤더가 다른 주요 패널과 같은 박스 스타일을 공유한다.
  - `counseling-record-workspace.module.css:47-64`
  - `counseling-record-workspace.module.css:120-140`

## UX 기준

- 첫 화면에서 사용자는 헤더의 설명문보다 `업로드/녹음` CTA를 봐야 한다.
- `선택 가능 기록`, `원문 준비 완료`, `AI 답변 방식`은 헤더 1차 정보가 아니다.
- 헤더가 너무 두꺼우면 아래 워크스페이스가 시작되기 전에 시선이 이미 분산된다.

## 최종 결정

### 1. 헤더는 얇게 유지한다

- 제목 1개
- 한 줄 보조 문구 1개
- 약한 보조 액션 1개

### 2. 메트릭 카드는 제거한다

- `선택 가능 기록`
- `원문 준비 완료`
- `AI 답변 방식`
- 위 3개는 헤더에서 제거한다.

### 3. 헤더에는 Primary CTA를 두지 않는다

- 1차 CTA는 좌측 생성 영역의 `파일 업로드`, `브라우저 녹음`이 맡는다.
- 헤더는 CTA 경쟁을 하지 않고 화면의 문맥만 잡는다.

### 4. 로그아웃은 약한 액션으로 내린다

- 현재처럼 강한 버튼으로 유지하지 않는다.
- 텍스트 버튼 또는 ghost button 수준으로 낮춘다.

### 5. 헤더는 카드가 아니라 타이틀 스트립처럼 보여야 한다

- 공통 패널 스타일에서 분리한다.
- 보더/그림자/배경을 최대한 약하게 하거나 제거한다.

## 요소별 처리

| 현재 요소 | 처리 | 이유 |
| --- | --- | --- |
| `YEON 상담 기록` eyebrow | 축소 또는 제거 | 제목보다 먼저 읽힐 이유가 없다 |
| `상담 기록 워크스페이스` 제목 | 유지 | 헤더의 핵심 |
| 긴 소개 문장 | 교체 | 1줄 보조 문구로 줄여야 한다 |
| 메트릭 3개 | 삭제 | 헤더의 주인공이 아니며 시선 분산 요소다 |
| 로그아웃 버튼 | 유지하되 약화 | 필요한 액션이지만 보조 수준이 적절하다 |

## 추천 카피

## 최종안

- 제목
  - `상담 기록 워크스페이스`
- 보조 문구
  - `업로드부터 원문 확인까지 한 화면에서 정리합니다.`
- 로그아웃
  - `로그아웃`

## 대안 카피

- 보조 문구 A
  - `원문 확인, 요약 정리, 후속 조치를 한 흐름으로 엽니다.`
- 보조 문구 B
  - `상담 기록을 원문 중심으로 정리합니다.`

## 비추천 카피

- `기록을 선택해 원문을 읽고, 핵심 요약을 확인한 뒤...`
- `선택 기록 한정 AI 답변`
- `선택 가능 기록 0건`

## 상태별 동작

## 공통

- 제목은 모든 상태에서 고정한다.
- 보조 문구도 되도록 고정한다.
- 상태에 따라 헤더 문구가 자주 바뀌지 않게 한다.

## 첫 진입

- 제목 + 고정 보조 문구 + 약한 로그아웃만 표시
- CTA는 헤더가 아니라 좌측 생성 영역에서 표시

## 생성 흐름

- 헤더 구성 동일
- 진행 상태는 생성 패널 내부에서 보여준다

## 목록 탐색

- 헤더 구성 동일
- 기록 수나 필터 상태는 헤더에 올리지 않는다

## 기록 선택 후

- 헤더는 여전히 동일
- 선택 기록 이름과 상태는 중앙 상세 헤더가 맡는다
- 상단 헤더에 다시 선택 기록 컨텍스트를 중복 표기하지 않는다

## 최종 구조

```tsx
<header className={styles.topbar}>
  <div className={styles.topbarCopy}>
    <p className={styles.topbarLabel}>YEON</p>
    <h1 className={styles.pageTitle}>상담 기록 워크스페이스</h1>
    <p className={styles.pageDescription}>
      업로드부터 원문 확인까지 한 화면에서 정리합니다.
    </p>
  </div>

  <form action="/api/auth/logout" method="post" className={styles.topbarActions}>
    <button type="submit" className={styles.topbarGhostButton}>
      로그아웃
    </button>
  </form>
</header>
```

## 마크업 규칙

- `topbarAside`, `topbarMeta`, `topbarMetric`은 제거 대상이다.
- `WorkspaceHeader`로 분리할 때는 아래 props만 가진다.
  - `title`
  - `description`
  - `onLogout?`
  - `secondaryActions?`

## 스타일 규칙

## 레이아웃

- `topbar`는 다른 주요 패널과 공통 스타일을 공유하지 않는다.
- 정렬은 `space-between` 유지 가능
- gap은 `16px` 안팎으로 줄인다
- padding은 `16px 4px 0` 또는 `12px 0 0`처럼 얇게 시작한다

## 표면

- 배경: 투명 또는 매우 약한 표면색
- 보더: 없음 또는 아래쪽 1px 구분선만 허용
- 그림자: 없음
- 반경: 0 또는 매우 작게

## 타이포

- label
  - 11-12px
  - 500
  - uppercase 강제는 하지 않는다
- title
  - 32-36px
  - 700
- description
  - 14-15px
  - 1줄 또는 최대 2줄
  - `max-width: 40-44ch`

## 액션 버튼

- 기본 secondary button 재사용 대신 header 전용 ghost 스타일 권장
- 배경 없이 텍스트 + 약한 border 또는 underline hover
- 최소 너비 강제 금지

## 모바일 규칙

- 제목과 보조 문구가 먼저 오고
- 로그아웃은 아래로 내려도 된다
- 버튼 전체 폭 강제는 하지 않는다
- 메트릭 카드가 제거되므로 현재보다 훨씬 얇은 높이가 되어야 한다

## CSS 변경 방향

## 제거 또는 분리

- `.topbar`를 `.sidebar`, `.detailHeader`, `.viewerPanel`, `.assistantPanel`과 묶은 공통 패널 셀렉터에서 제외
  - 현재: `counseling-record-workspace.module.css:47-56`
- `.topbarAside`, `.topbarMeta`, `.topbarMetric`는 삭제 대상
  - 현재: `counseling-record-workspace.module.css:113-140`

## 신규 또는 대체

- `.topbarLabel`
- `.topbarGhostButton`
- 필요 시 `.topbarDivider`

## 구현 체크리스트

1. 긴 소개 문장을 한 줄 보조 문구로 교체
2. 메트릭 3개 제거
3. 헤더 공통 패널 스타일 분리
4. 로그아웃 버튼을 ghost 수준으로 약화
5. 모바일에서 헤더가 첫 화면 CTA를 밀어내지 않는지 확인

## 완료 기준

- 헤더만 봐도 `정보 보드`가 아니라 `문서 제목줄`처럼 보여야 한다.
- 헤더 아래 첫 시선은 좌측 `파일 업로드`, `브라우저 녹음`으로 내려가야 한다.
- 헤더 높이가 지금보다 확실히 줄어야 한다.
- 메트릭 카드가 없어도 사용자가 길을 잃지 않아야 한다.

## 차수 7 입력값

- 차수 7에서는 이 헤더 기준을 유지한 채, 선택 전 중앙/우측 빈 상태를 하나의 행동 중심 구조로 재구성한다.
