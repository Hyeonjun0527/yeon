# 상담 전사 B+ 표시 모델 + 가상 스크롤 백로그

## 차수 1

### 작업내용

- raw transcript segment를 입력으로 받아 `화자 턴 + 내부 읽기 분할` 형태의 `B+ display block`을 만드는 app-local helper를 추가한다.
- source of truth는 기존 raw segment로 유지하고, display block은 파생 값으로만 만든다.
- 워크스페이스 전사 뷰어와 홈 센터 패널이 같은 helper를 재사용하도록 구조를 맞춘다.

### 논의 필요

- helper 위치를 `apps/web/src/lib`에 둘지, 상담 기능 경계 안 helper로 둘지
- 내부 읽기 분할 기준을 문장 부호 중심으로 둘지, 글자 수/segment 수 보조 기준까지 둘지

### 선택지

- `apps/web/src/lib/counseling-transcript-display.ts` 같은 web app-local helper로 둔다
- 각 화면이 자기 방식으로 따로 파생한다

### 추천

- 두 화면이 이미 다른 디렉터리에 있으므로, `packages/*`까지 올리지 말고 `apps/web` app-local helper로 공용화한다.
- 내부 분할은 `화자 턴 유지`를 우선하고, 문장 부호 + 길이 보조 기준으로만 최소 개입한다.

### 사용자 방향

- `B+`
- raw segment는 그대로 유지
- display block은 읽기 전용

## 차수 2

### 작업내용

- 워크스페이스 전사 뷰어를 raw segment 1:1 렌더링에서 `B+ display block` 렌더링으로 교체한다.
- block click -> 첫 raw segment start 기준 seek, block active -> 내부 raw segment active 전파를 구현한다.
- block에서 수정 액션 진입 시 raw segment 편집 모드로 내려가도록 연결한다.
- 검색/매치 수 계산도 display block 기준으로 다시 정렬하되, source of truth는 raw segment로 유지한다.

### 논의 필요

- 수정 액션 진입 UX를 inline 펼침으로 둘지, 별도 하위 목록으로 둘지
- block 헤더에 화자명만 둘지, 구간 수/재생시간 정보도 함께 둘지

### 선택지

- inline 하위 raw segment 편집
- block 클릭 시 별도 편집 패널

### 추천

- 이번 차수는 inline 하위 raw segment 편집이 가장 작고 안전하다.
- 화자명, 시작 시각, 포함 구간 수 정도만 상위 block 메타로 노출한다.

### 사용자 방향

- `A`
- display block 직접 수정 금지
- raw segment 편집 모드로만 수정

## 차수 3

### 작업내용

- 워크스페이스 전사 뷰어에 `@tanstack/react-virtual` 기반 가상 스크롤을 적용한다.
- 1시간 전사 기준 검색 입력, 스크롤, 재생 따라가기에서 끊김이 없도록 overscan과 active scroll 정책을 정리한다.
- 홈 센터 패널도 같은 display model로 맞춰 최소한의 시각 일관성을 확보한다.
- 관련 유틸/컴포넌트 테스트를 추가한다.

### 논의 필요

- 가상화 적용 범위를 워크스페이스만 먼저 할지, 홈 센터 패널까지 한 번에 넣을지
- 자동 따라가기 시 `smooth` 유지 여부와 검색 중 스크롤 점프 정책

### 선택지

- 워크스페이스 우선 적용 후 홈은 후속 차수
- 두 surface를 한 번에 맞춘다

### 추천

- display model helper는 먼저 공유하고, 가상화는 워크스페이스 우선 적용한다.
- 홈 센터 패널은 같은 block 렌더링 규칙만 먼저 맞추고, 가상화는 데이터량을 본 뒤 후속 적용해도 된다.

### 사용자 방향

- 1시간 전사까지 고려
- 가상 스크롤 계획 포함
