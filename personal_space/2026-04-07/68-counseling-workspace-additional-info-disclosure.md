# 상담 기록 워크스페이스 추가 정보 디스클로저 설계

## 목적

- [67-counseling-workspace-progressive-create-form.md](/home/osuma/coding_stuffs/yeon/personal_space/2026-04-07/67-counseling-workspace-progressive-create-form.md)에서 숨기기로 한 2차 입력을 어떤 방식으로 드러낼지 고정한다.
- 이번 차수의 핵심은 `접기/펼치기 기능 추가`가 아니라, `기본 생성 흐름을 막지 않는 얇은 보조 입구`를 만드는 것이다.
- 구현 단계에서는 이 문서를 기준으로 `추가 정보` 섹션의 라벨, 위치, 자동 열림 조건, 스타일, 접근성 규칙을 맞춘다.

## 현재 문제

## 코드 기준

- 현재 업로드 패널은 열리면 생성 폼 전체가 그대로 드러나는 구조라서 `2차 입력만 접는 중간 단계`가 없다.
  - `counseling-record-workspace.tsx:1551-1735`
- 현재 저장소 안에는 재사용 중인 disclosure/accordion 패턴이 없다.
  - `apps/web/src` 검색 기준
- 지금 있는 접힘 패턴은 업로드 패널 전체를 열고 닫는 것뿐이라, `폼 내부 정보 밀도 제어`에는 맞지 않는다.
  - `counseling-record-workspace.tsx:1551-1567`
  - `counseling-record-workspace.tsx:1743-1752`

## UX 판단

- `학생 정보와 메모`처럼 설명적인 이름은 디스클로저 자체를 또 읽게 만든다.
- 첫 저장 흐름에서는 사용자가 이 영역을 이해할 필요보다 `필요하면 열 수 있다`는 사실만 알면 된다.
- 따라서 보조 필드는 `작고 분명한 입구` 하나로 숨기고, 기본 흐름은 그 위를 지나가게 만들어야 한다.

## 최종 결정

## 라벨 선택

- 백로그 추천안 `A. 추가 정보`로 고정한다.

## 이유

- 짧다.
- 의미가 넓어서 제목, 학년/반, 상담 유형을 모두 담을 수 있다.
- 워크스페이스 톤과 맞는다.
- `학생 정보와 메모`처럼 과하게 설명적이지 않다.

## 디스클로저 역할

### 지금까지

- 없음

### 앞으로

- `저장 전에 선택적으로 조정할 수 있는 2차 메타 입력 입구`

## 포함 필드

- 상담 제목
- 학년/반
- 상담 유형

## 제외 필드

- 학생 이름
- 파일 업로드
- 브라우저 녹음
- 기록 저장

## 위치 결정

## 배치 순서

```text
1. 선택 오디오 카드
2. 학생 이름
3. 추가 정보 디스클로저
4. 기록 저장
```

## 이유

- 학생 이름은 최소 확인 정보라 디스클로저 밖에 있어야 한다.
- 저장 버튼은 여전히 가까워야 하지만, 보조 입력 입구는 저장 전에 한 번 눈에 들어와야 한다.
- 디스클로저를 저장 버튼 아래에 두면 존재를 놓치기 쉽고, CTA 위에 두면 또다시 위계를 흐린다.

## 노출 규칙

## 등장 시점

- `selectedAudioFile`이 생긴 뒤에만 렌더한다.
- 오디오 선택 전에는 존재 자체를 숨긴다.

## 기본 상태

- 닫힘

## 열린 상태 유지

- 사용자가 명시적으로 열면 현재 드래프트 안에서는 유지 가능
- 사용자가 닫으면 다시 닫힘
- 저장 성공 후에는 무조건 닫힘으로 초기화

## 자동 열림 조건

- 숨겨진 필드에서 검증 오류가 발생했을 때
- 사용자가 `상담 제목`을 수정해야 할 상황이 생겼을 때
- 기존 hidden 값이 남아 있고 사용자가 해당 상태를 확인해야 할 때

## 자동 열림 금지

- 오디오를 선택했다는 이유만으로 자동으로 열지 않는다.
- `학년/반`이 비어 있다는 이유만으로 자동으로 열지 않는다.

## 접힘 행 구성

## 닫힘 상태

```text
[Chevron] 추가 정보                      제목, 학년/반, 상담 유형
```

## 규칙

- 한 줄 행으로 보인다.
- 좌측은 라벨, 우측은 매우 약한 요약 텍스트와 chevron 정도만 둔다.
- 요약은 칩이 아니라 plain text다.
- 설명 문장은 붙이지 않는다.

## 열림 상태

```text
[Chevron] 추가 정보
상담 제목 입력
학년/반 입력
상담 유형 선택
```

## 규칙

- 펼쳐졌을 때도 별도 큰 카드가 되지 않는다.
- 기존 패널 안에서 `행 -> 내용`이 자연스럽게 이어지는 구조여야 한다.
- `상담 제목`은 full width, `학년/반`과 `상담 유형`은 좁은 화면에서 세로, 넓은 화면에서 2열 배치 가능하다.

## 요약 텍스트 규칙

## 기본값

- `제목, 학년/반, 상담 유형`

## 수정값이 있을 때

- `2개 설정됨`
- 또는 `제목 수정됨`

## 원칙

- 요약은 12자 안팎으로 짧아야 한다.
- 값 전체를 길게 노출하지 않는다.
- 칩/배지로 개별 필드를 나열하지 않는다.

## 상호작용 규칙

## 동작 방식

- `button type="button"`으로 구현한다.
- `aria-expanded`, `aria-controls`를 연결한다.
- disclosure body는 고유 id를 가진다.
- chevron은 열림 여부에 따라 회전한다.

## 포커스

- 버튼 포커스 링이 보여야 한다.
- 버튼으로 열었을 때 첫 번째 필드인 `상담 제목`으로 바로 이동시키는 것은 선택 사항이다.
- 검증 오류로 자동 열릴 때는 반드시 첫 오류 필드로 포커스를 이동한다.

## 모션

- 160-200ms 정도의 짧은 height/opacity 전환만 허용한다.
- `prefers-reduced-motion`에서는 전환을 제거한다.

## 스타일 규칙

## 닫힘 행

- 높이 `44-48px`
- 별도 그림자 없음
- 배경은 투명 또는 `surface-soft` 수준의 약한 톤
- 보더는 `1px solid var(--border-soft)` 또는 상단 divider 수준
- hover에서만 약한 배경 변화

## 열린 본문

- 별도 카드 금지
- `padding-top: 12-14px`
- 필드 간 gap `12px`
- 본문 위에 약한 divider 허용

## 금지

- 점선 박스
- 카드 안의 카드
- 설명문이 붙은 서브 패널
- `추가 정보` 자체를 primary button처럼 강조하는 스타일

## 카피 규칙

| 위치 | 권장 문구 |
| --- | --- |
| 디스클로저 라벨 | `추가 정보` |
| 닫힘 요약 | `제목, 학년/반, 상담 유형` |
| 오류 후 안내 | 별도 문장 없이 해당 필드 인라인 오류로 처리 |

## 비추천 문구

- `학생 정보와 메모`
- `상세 설정`
- `추가 입력이 필요하면 여기를 눌러 주세요`
- `기록 메타데이터 편집`

## 상태 전이 규칙

## 오디오 선택 직후

- 닫힌 `추가 정보` 행이 나타난다.
- 제목은 내부적으로 자동 생성돼 있어도 닫힌 상태를 유지한다.

## 사용자가 직접 펼침

- 해당 드래프트 동안 상태 유지 가능
- 값을 수정한 뒤 닫아도 값은 유지된다

## 저장 오류

- hidden 필드 오류면 자동으로 펼친다.
- 오류 필드에 포커스를 준다.
- 행 자체에 큰 경고 박스를 붙이지 않는다.

## 저장 성공

- 닫힘 상태로 리셋
- hidden 값도 다음 드래프트 기준으로 다시 초기화

## 마크업 방향

```tsx
const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false);

{selectedAudioFile ? (
  <div className={styles.additionalInfoSection}>
    <button
      type="button"
      className={styles.additionalInfoToggle}
      aria-expanded={isAdditionalInfoOpen}
      aria-controls="create-record-additional-fields"
      onClick={() => setIsAdditionalInfoOpen((current) => !current)}
    >
      <span className={styles.additionalInfoLabel}>추가 정보</span>
      <span className={styles.additionalInfoSummary}>제목, 학년/반, 상담 유형</span>
    </button>

    {isAdditionalInfoOpen ? (
      <div id="create-record-additional-fields" className={styles.additionalInfoBody}>
        <label>상담 제목</label>
        <div className={styles.additionalInfoGrid}>
          <label>학년/반</label>
          <label>상담 유형</label>
        </div>
      </div>
    ) : null}
  </div>
) : null}
```

## 권장 CSS 분리

- `.additionalInfoSection`
- `.additionalInfoToggle`
- `.additionalInfoLabel`
- `.additionalInfoSummary`
- `.additionalInfoChevron`
- `.additionalInfoBody`
- `.additionalInfoGrid`

## 구현 메모

- 현재 저장소에 disclosure 패턴이 없으므로, 워크스페이스 전용 로컬 패턴으로 두는 편이 안전하다.
- native `<details>`보다 explicit state button이 오류 시 자동 열림과 포커스 제어에 유리하다.
- `상담 유형`은 서버 기본값이 이미 `대면 상담`이므로, 사용자가 열지 않으면 조용히 기본값으로 저장돼도 괜찮다.

## 이번 차수의 완료 판단

- `추가 정보`가 오디오 선택 후에만 보이는지
- 기본 저장 흐름이 펼치지 않아도 진행되는지
- 펼쳐져도 별도 카드 덩어리가 추가되지 않는지
- hidden 필드 오류가 생기면 자동으로 열리고 포커스가 이동하는지
