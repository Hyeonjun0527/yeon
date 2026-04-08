# 상담 기록 워크스페이스 현재 UI 과밀 진단 메모

## 범위

- 대상 파일
  - `apps/web/src/features/counseling-record-workspace/counseling-record-workspace.tsx`
  - `apps/web/src/features/counseling-record-workspace/counseling-record-workspace.module.css`
- 기준
  - 첫 인상은 `여기서 업로드하거나 녹음하면 된다`가 먼저 보여야 한다.
  - 기능은 유지하되, 초기 노출량과 박스 밀도는 줄여야 한다.
  - `왼쪽 생성/탐색 -> 가운데 원문 -> 오른쪽 AI` 구조는 유지 가능하되, 선택 전에는 3열 완전체처럼 보이면 안 된다.

## 현재 화면이 답답하게 느껴지는 구조적 이유

### 1. 상단이 행동보다 설명과 상태를 먼저 보여준다

- 상단 헤더가 긴 소개 문장과 3개의 메트릭 카드로 시작한다.
- 실제 코드도 제목 아래 설명문, 우측 메트릭, 로그아웃 버튼이 먼저 배치되어 있어 첫 행동 CTA보다 먼저 시선을 가져간다.
- 근거
  - `counseling-record-workspace.tsx:1506-1546`
  - `counseling-record-workspace.module.css:47-64`
  - `counseling-record-workspace.module.css:120-140`

### 2. 입력 전인데 입력 요소가 너무 많이 한꺼번에 열린다

- 업로드 패널이 열리면 학생명, 학년/반, 상담 제목, 상담 유형, 파일 선택, 녹음, 상태 메시지, 저장 버튼이 동시에 나온다.
- 사용자의 첫 행동은 `파일 업로드` 또는 `브라우저 녹음`인데, 현재는 관리용 메타데이터 입력이 같은 우선순위로 노출된다.
- 근거
  - `counseling-record-workspace.tsx:1551-1739`
  - `counseling-record-workspace.module.css:172-187`
  - `counseling-record-workspace.module.css:274-278`

### 3. 카드 안의 카드가 반복돼 여백보다 박스가 먼저 보인다

- 바깥 레벨에서 `topbar`, `sidebar`, `detailHeader`, `viewerPanel`, `assistantPanel` 모두 강한 패널이다.
- 그 안에서 다시 `uploadCard`, `selectedAudioCard`, `audioPanel`, `summaryCard`, `summarySection`, `actionCard`, `messageItem`이 중첩된다.
- 이 구조는 정리감보다 관리툴/행정툴 같은 압박감을 만든다.
- 근거
  - `counseling-record-workspace.module.css:47-56`
  - `counseling-record-workspace.module.css:179-187`
  - `counseling-record-workspace.module.css:402-413`
  - `counseling-record-workspace.module.css:759-779`
  - `counseling-record-workspace.module.css:1002-1010`
  - `counseling-record-workspace.module.css:1135-1141`

### 4. 중요하지 않은 상태 정보가 상단과 탐색 영역에서 과하게 강조된다

- `선택 가능 기록`, `원문 준비 완료`, `AI 답변 방식`, `전체 n건`, `원문 준비 n건`, 상태 필터 수치가 초반부터 강하게 보인다.
- 이 정보는 운영 보조 정보이지 첫 행동을 안내하는 1차 정보가 아니다.
- 근거
  - `counseling-record-workspace.tsx:1517-1531`
  - `counseling-record-workspace.tsx:1757-1805`
  - `counseling-record-workspace.module.css:245-266`
  - `counseling-record-workspace.module.css:481-558`

### 5. 빈 상태가 하나의 명확한 행동으로 수렴하지 않는다

- 기록 선택 전 중앙에는 큰 빈 박스가 뜨고, 우측 AI 패널 자리에도 또 빈 상태가 뜬다.
- 좌측 업로드 빈 상태까지 더하면, 데이터가 없을수록 화면이 단순해지지 않고 오히려 미완성처럼 보인다.
- 근거
  - `counseling-record-workspace.tsx:1686-1695`
  - `counseling-record-workspace.tsx:2368-2377`
  - `counseling-record-workspace.tsx:2486-2493`
  - `counseling-record-workspace.module.css:680-691`

### 6. 선택 전에도 오른쪽 AI 패널이 레이아웃 자리를 점유한다

- 3열 구조가 먼저 고정되고, 기록이 없어도 AI 패널 칼럼 자체가 존재한다.
- 결과적으로 선택 전 화면이 `업로드 -> 원문 -> AI` 단계형이 아니라 `업로드 + 빈 본문 + 빈 AI` 병렬 구조로 보인다.
- 근거
  - `counseling-record-workspace.module.css:155-165`
  - `counseling-record-workspace.tsx:2381-2494`

### 7. 중앙 본문에서도 원문보다 설명과 메타가 먼저 많다

- 선택 후 상세 헤더에 설명문, 메타칩, 보조 문구, 음성 패널, 재전사 버튼이 먼저 길게 나온다.
- 원문이 주인공이어야 하는데, 실제로는 원문 이전의 준비 UI가 너무 길다.
- 근거
  - `counseling-record-workspace.tsx:1900-2078`
  - `counseling-record-workspace.module.css:702-757`

### 8. 요약과 액션도 결과보다 패널 구조가 먼저 읽힌다

- 요약은 상단에 큰 카드 4장으로, 액션은 별도 카드 반복으로 풀어져 있다.
- 정보의 의미보다 카드 개수와 구획이 먼저 느껴진다.
- 근거
  - `counseling-record-workspace.tsx:2080-2365`
  - `counseling-record-workspace.module.css:759-779`
  - `counseling-record-workspace.module.css:1002-1065`

### 9. AI 패널도 선택 후에는 유용하지만 초기 설명과 문맥 배지가 많다

- 선택 후 AI 패널은 원문 기반 보조라는 역할은 맞다.
- 다만 설명문, 문맥 배지, 상태 문장, 퀵프롬프트, 대화 리스트, 입력창이 한 번에 모두 보여 밀도가 다시 올라간다.
- 근거
  - `counseling-record-workspace.tsx:2384-2484`
  - `counseling-record-workspace.module.css:1067-1199`

## 코드 기준 분류

## 1. 유지

| 요소                               | 근거                                                                                     | 유지 이유                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 업로드와 브라우저 녹음의 이중 진입 | `counseling-record-workspace.tsx:1638-1660`                                              | 첫 행동 자체는 맞다. 문제는 주변 입력과 설명이 너무 많다는 점이다.                        |
| 기록 탐색 리스트 구조              | `counseling-record-workspace.tsx:1807-1893`                                              | 학생별 기록 선택이라는 워크스페이스 구조의 핵심이다. 다만 밀도와 보조 정보는 줄여야 한다. |
| 원문 전체 보기와 시간 이동         | `counseling-record-workspace.tsx:1984-2002`, `counseling-record-workspace.tsx:2206-2284` | 제품 신뢰의 source of truth가 원문이라는 방향과 맞는다.                                   |
| 요약/액션/원문 탭이라는 작업 구분  | `counseling-record-workspace.tsx:2101-2365`                                              | 정보 종류 분리는 유효하다. 다만 카드 수와 헤더 문구를 줄여야 한다.                        |
| 선택 기록 한정 AI 보조라는 정책    | `counseling-record-workspace.tsx:2401-2419`                                              | AI의 역할 정의는 정확하다. 상시 노출과 설명량만 줄이면 된다.                              |

## 2. 삭제

| 요소                               | 근거                                        | 삭제 이유                                                          |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| 상단 긴 소개 문장                  | `counseling-record-workspace.tsx:1510-1514` | 사용자는 거의 읽지 않고, 첫 행동을 늦춘다.                         |
| 상단 3개 메트릭 카드               | `counseling-record-workspace.tsx:1517-1531` | 첫 화면의 주인공이 아니다. 목록/상세 보조 정보로 내리는 편이 맞다. |
| 접힌 업로드 버튼의 긴 설명문       | `counseling-record-workspace.tsx:1748-1753` | CTA 옆 제품 설명이 길다. 버튼 역할만 남기면 충분하다.              |
| 업로드 빈 상태의 긴 보관/전사 설명 | `counseling-record-workspace.tsx:1686-1695` | 첫 단계에서 읽을 정보가 아니다.                                    |
| 상세 헤더의 긴 설명문              | `counseling-record-workspace.tsx:1923-1927` | 원문 보기 전에 설명이 또 길어진다.                                 |
| AI 패널 상단 설명문                | `counseling-record-workspace.tsx:2394-2398` | 이미 패널 제목과 프롬프트가 역할을 설명한다.                       |
| 선택 전 AI 빈 상태 패널 문구       | `counseling-record-workspace.tsx:2486-2493` | 선택 전에는 아예 자리와 문구를 없애는 편이 낫다.                   |

## 3. 숨김

| 요소                                          | 근거                                        | 숨김 방식                                                |
| --------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| 학생 이름, 학년/반, 상담 제목, 상담 유형 입력 | `counseling-record-workspace.tsx:1576-1628` | `추가 정보` 섹션으로 접고 기본값 또는 후입력으로 미룬다. |
| 좌측 전체/원문 준비 요약                      | `counseling-record-workspace.tsx:1762-1765` | 기록이 많을 때만 약한 보조 텍스트로 처리한다.            |
| 상태 필터칩                                   | `counseling-record-workspace.tsx:1783-1805` | 기본 노출 대신 `필터` 토글 뒤에 둔다.                    |
| 상세 메타칩 다발                              | `counseling-record-workspace.tsx:1929-1957` | 1차 메타만 남기고 나머지는 접힌 보조 메타로 이동한다.    |
| 원문 탭 상단 메타 나열                        | `counseling-record-workspace.tsx:2150-2182` | 검색/진행 상태만 남기고 상세 메타는 축소한다.            |
| AI 패널의 문맥 배지와 보조 설명               | `counseling-record-workspace.tsx:2401-2419` | `컨텍스트` 토글 안으로 접거나 한 줄로 축약한다.          |
| 퀵프롬프트 전체 노출                          | `counseling-record-workspace.tsx:2422-2433` | 패널 첫 진입에서 일부만 보여주고 나머지는 접는다.        |

## 4. 선택 후 노출

| 요소                      | 근거                                        | 선택 후에만 보여야 하는 이유                                  |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| 중앙 상세 헤더 전체       | `counseling-record-workspace.tsx:1900-2078` | 기록을 모르면 문맥이 성립하지 않는다.                         |
| 요약 카드/탭/액션         | `counseling-record-workspace.tsx:2080-2365` | 기록이 있어야만 의미가 생긴다.                                |
| 오른쪽 AI 패널 전체       | `counseling-record-workspace.tsx:2381-2484` | 선택 전에는 정보 밀도만 높이고 행동 유도에는 기여하지 않는다. |
| 오디오 패널과 재전사 액션 | `counseling-record-workspace.tsx:1963-2077` | 기록 확인 단계의 도구이지 첫 진입 CTA가 아니다.               |

## 시각 밀도를 만드는 CSS 원인

### 공통 패널이 모두 강하다

- 외곽의 주요 컨테이너가 모두 동일한 보더, 32px 라운드, 큰 그림자를 가진다.
- 이 공통 규칙 때문에 페이지 전체가 이미 무겁게 시작한다.
- 근거
  - `counseling-record-workspace.module.css:47-56`

### 내부 컴포넌트도 다시 박스로 감싼다

- 업로드 빈 상태, 선택 오디오 카드, 오디오 패널, 요약 카드, 액션 카드, 메시지 카드가 모두 별도 박스를 갖는다.
- 레이아웃의 구분이 정렬과 여백이 아니라 상자 수로 해결되고 있다.
- 근거
  - `counseling-record-workspace.module.css:402-413`
  - `counseling-record-workspace.module.css:576-596`
  - `counseling-record-workspace.module.css:759-779`
  - `counseling-record-workspace.module.css:1002-1010`
  - `counseling-record-workspace.module.css:1135-1149`

### 3열 구조가 너무 빨리 완성된다

- 기본 레이아웃이 큰 화면에서 바로 3열 고정이다.
- 선택 전에도 AI 칼럼 자리가 예약되므로, 단계형 흐름보다 병렬 기능 나열처럼 보인다.
- 근거
  - `counseling-record-workspace.module.css:155-165`
  - `counseling-record-workspace.module.css:1243-1268`

## 차수 2로 넘길 고정 판단

- 첫 화면은 `파일 업로드`, `브라우저 녹음` 2개 행동이 가장 먼저 보여야 한다.
- 기록 선택 전에는 중앙과 우측에서 큰 빈 패널이 동시에 보이면 안 된다.
- 입력은 `최소 입력`과 `추가 정보`로 나눠야 한다.
- 상태 수치와 운영 메타는 상단 주인공에서 내려야 한다.
- 원문은 선택 후 화면에서 가장 큰 읽기 영역이어야 한다.
- AI는 `선택 후 노출`이 기본값이어야 한다.
- 구분은 박스 추가보다 여백과 위계로 해결해야 한다.

## 다음 차수 입력값

- 차수 2는 이 문서를 기준으로 `첫 진입`, `생성 흐름`, `목록 탐색`, `기록 선택 후` 상태 맵을 작성한다.
- 상태 맵 작성 시 `삭제`, `숨김`, `선택 후 노출` 분류를 그대로 사용한다.
