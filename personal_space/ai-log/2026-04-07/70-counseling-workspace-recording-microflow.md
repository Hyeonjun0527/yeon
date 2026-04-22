# 상담 기록 워크스페이스 녹음 상태 마이크로플로우 정리

## 목적

- [66-counseling-workspace-primary-cta-block.md](/home/osuma/coding_stuffs/yeon/personal_space/2026-04-07/66-counseling-workspace-primary-cta-block.md)에서 정한 `녹음 진행 상태 -> 중지 -> 저장` 흐름을 실제 UI 상태 단위로 고정한다.
- 이번 차수의 핵심은 `녹음 기능 추가`가 아니라, `지금 어디까지 진행됐는지 한눈에 읽히게 만드는 것`이다.
- 구현 단계에서는 이 문서를 기준으로 녹음 버튼, 타이머, 중지 후 전환 상태, 오류 메시지의 역할을 다시 나눈다.

## 현재 문제

## 코드 기준

- 현재 녹음 상태는 `브라우저 녹음` 버튼 텍스트 하나에 `중지`와 `타이머`를 같이 넣는 방식이다.
  - `counseling-record-workspace.tsx:1637-1658`
- 녹음 시작 시 별도 success 메시지로 `녹음을 시작했습니다...`를 띄우지만, 이 메시지는 버튼 상태와 분리돼 있어 시선이 갈라진다.
  - `counseling-record-workspace.tsx:1152-1158`
- `stop` 이벤트 안에서 `setIsRecording(false)`가 먼저 실행되고 나서 녹음 파일을 만들기 때문에, 짧게라도 녹음 UI가 사라졌다가 다시 선택 오디오 상태로 넘어갈 수 있다.
  - `counseling-record-workspace.tsx:1178-1204`
- 녹음 중에도 `파일 선택` 버튼은 같은 행에 남아 있고, 단지 disabled만 되어 있어 현재 단계의 주인공이 조금 흐려진다.
  - `counseling-record-workspace.tsx:1636-1658`

## UX 판단

- 녹음 흐름은 짧고 선형적이다.
- 사용자는 `지금 녹음 중인지`, `얼마나 지났는지`, `중지하면 무엇이 되는지`만 빠르게 이해하면 된다.
- 지금처럼 버튼 문구가 계속 길어지면 행동과 상태가 한 덩어리로 섞여 읽힌다.
- 따라서 `행동 버튼`과 `상태 정보`를 분리해야 한다.

## 최종 결정

## 선택

- 백로그 추천안 `B. 버튼 아래 상태 줄로 분리`를 채택한다.

## 이유

- 버튼은 `행동`만 말해야 한다.
- 타이머는 `상태`이므로 분리된 줄이나 블록에서 읽히는 편이 자연스럽다.
- 버튼 안에 시간이 들어가면 폭이 계속 바뀌고, 모바일에서는 더 답답해진다.

## 녹음 상태 모델

## 1. idle

### 의미

- 아직 녹음을 시작하지 않음

### UI

- `브라우저 녹음` CTA
- 보조 문구 `지금 바로 녹음 시작`

## 2. recording

### 의미

- 마이크 권한을 얻었고 실제 녹음 중

### UI

- `녹음 중지` 버튼
- 상태 줄
  - `현재 녹음 중`
  - `00:34 경과`
  - `중지 후 저장 준비`

## 3. finalizing

### 의미

- 사용자가 중지를 눌렀고, 녹음 Blob을 파일로 정리 중

### UI

- 버튼은 비활성
- 상태 줄
  - `녹음 정리 중`
  - `저장 전 확인을 준비하고 있습니다`

## 4. ready-to-save

### 의미

- 녹음 파일이 선택 오디오 상태로 전환됨

### UI

- [69-counseling-workspace-selected-audio-preview.md](/home/osuma/coding_stuffs/yeon/personal_space/2026-04-07/69-counseling-workspace-selected-audio-preview.md)의 선택 오디오 카드
- `기록 저장`

## 5. error

### 의미

- 마이크 권한 실패, 브라우저 미지원, 빈 데이터 등

### UI

- 인라인 오류 메시지
- `파일 업로드` 대체 경로 유지

## 핵심 흐름

```text
브라우저 녹음
-> 현재 녹음 중
-> 녹음 정리 중
-> 선택한 오디오 확인
-> 기록 저장
```

## 지금 반드시 고쳐야 하는 문제

## 1. 버튼 텍스트 과밀

### 현재

- `녹음 중지 (00:34)`

### 변경

- 버튼: `녹음 중지`
- 상태 줄: `00:34 경과`

## 2. 중지 직후 상태 공백

### 현재

- `isRecording`이 false가 된 뒤 `applySelectedAudioFile`이 끝날 때까지 녹음 UI가 잠깐 사라질 수 있다.

### 변경

- `finalizing` 상태를 명시적으로 둔다.
- 사용자는 `녹음 정리 중`을 보고 기다린다.

## 3. 메시지 중복

### 현재

- 버튼 상태
- success 메시지
- 이후 선택 오디오 카드

### 변경

- 녹음 상태는 `RecordingStateBlock` 안에서만 표현한다.
- success 인라인 메시지는 예외 상황이 아닐 때 줄인다.

## 상태 표현 규칙

## recording 상태

```text
[ 녹음 중지 ]
현재 녹음 중
00:34 경과 · 중지 후 저장 준비
```

## finalizing 상태

```text
[ 비활성 버튼 또는 spinner ]
녹음 정리 중
저장 전 확인을 준비하고 있습니다
```

## ready-to-save 상태

```text
선택한 오디오
브라우저 녹음 2026.04.07 14:30
8.2MB · 07분 44초 · 저장 준비
```

## 레이아웃 규칙

## 버튼과 상태 줄 관계

- 버튼은 상단 1개
- 상태 정보는 버튼 아래 1개 블록
- 둘 사이 간격 `8-10px`
- 상태 줄은 작은 메타 텍스트 1~2줄로 제한

## 버튼 라벨 규칙

- idle: `브라우저 녹음`
- recording: `녹음 중지`
- finalizing: `녹음 정리 중`

## 금지

- 버튼 라벨에 타이머 포함
- 버튼 라벨에 설명문 포함
- 카드, 배지, 인라인 메시지에서 같은 상태를 세 번 반복

## 시각 규칙

## recording 버튼

- 평소 CTA보다 조금 강한 active 상태 허용
- danger full-fill까지 갈 필요는 없고, muted red tint 수준이면 충분하다
- 버튼 길이는 고정감 있게 유지

## 상태 줄

- 라벨 1줄 + 메타 1줄
- `현재 녹음 중`은 13-14px / 600
- 시간과 힌트는 12-13px / muted
- 빨간 점이나 pulse는 있어도 1개만 허용

## finalizing 상태

- 과한 로딩 카드 금지
- 작은 spinner + 짧은 문구 정도면 충분
- 사용자가 `멈춘 게 맞나?`를 헷갈리지 않게 비활성 처리만 명확히 한다

## 상호작용 규칙

## 녹음 시작

- `파일 업로드` CTA는 숨기거나 최소한 강하게 비활성화한다.
- 사용자는 현재 흐름이 녹음임을 즉시 알아야 한다.

## 녹음 중지

- 중지 클릭 후 즉시 recording 상태를 지우지 않는다.
- `finalizing`으로 넘어가며 버튼 재클릭을 막는다.

## 오류

- 마이크 권한 실패
- 브라우저 미지원
- 빈 데이터

위 경우만 인라인 오류로 남긴다.

## 성공

- `녹음을 시작했습니다.` 같은 안내 문장은 상태 블록으로 대체한다.
- `선택 완료` 같은 성공 메시지는 선택 오디오 카드로 대체한다.

## 카피 개선안

| 상황             | 현재                                                   | 변경                                                |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------- |
| 녹음 idle        | `브라우저 녹음`                                        | 유지                                                |
| 녹음 중 버튼     | `녹음 중지 (00:34)`                                    | `녹음 중지`                                         |
| 녹음 시작 메시지 | `녹음을 시작했습니다. 끝나면 중지 버튼을 눌러 주세요.` | 삭제                                                |
| 녹음 중 상태 줄  | 없음                                                   | `현재 녹음 중` / `00:34 경과 · 중지 후 저장 준비`   |
| 정리 중 상태     | 없음                                                   | `녹음 정리 중` / `저장 전 확인을 준비하고 있습니다` |

## 마크업 방향

```tsx
const recordingPhase = isRecording
  ? "recording"
  : isFinalizingRecording
    ? "finalizing"
    : "idle";

{
  recordingPhase === "idle" ? (
    <button type="button" className={styles.primaryCtaTile}>
      브라우저 녹음
    </button>
  ) : (
    <div className={styles.recordingStateBlock}>
      <button
        type="button"
        className={styles.recordingActionButton}
        onClick={recordingPhase === "recording" ? stopRecording : undefined}
        disabled={recordingPhase === "finalizing"}
      >
        {recordingPhase === "recording" ? "녹음 중지" : "녹음 정리 중"}
      </button>

      <div className={styles.recordingStatusRow}>
        <p className={styles.recordingStatusTitle}>
          {recordingPhase === "recording" ? "현재 녹음 중" : "녹음 정리 중"}
        </p>
        <p className={styles.recordingStatusMeta}>
          {recordingPhase === "recording"
            ? `${formatCompactDuration(recordingElapsedMs)} 경과 · 중지 후 저장 준비`
            : "저장 전 확인을 준비하고 있습니다"}
        </p>
      </div>
    </div>
  );
}
```

## 권장 상태 추가

- `isFinalizingRecording: boolean`

## 이유

- 현재 코드에는 `stop -> file build -> applySelectedAudioFile` 사이의 전이 상태가 없다.
- 이 값이 있어야 idle로 잠깐 되돌아가는 문제를 막을 수 있다.

## 구현 메모

- `stop` 이벤트에서 `setIsRecording(false)`만 먼저 호출하는 현재 순서는 UI 기준으로 어색하다.
- 녹음 상태는 `uploadState.message`에 의존하지 말고 별도 파생 상태로 렌더하는 편이 안전하다.
- 녹음 완료 후 파일명이 기계적인 `counseling-record-...` 형태라면, 9차에서 정한 readable title 정책과 함께 맞춰야 한다.

## 이번 차수의 완료 판단

- 버튼 텍스트에 타이머가 더 이상 들어가지 않는지
- `녹음 중 -> 녹음 정리 중 -> 저장 대기` 흐름이 끊기지 않고 읽히는지
- success 메시지 없이도 현재 상태를 이해할 수 있는지
- 중지 직후 idle CTA로 잠깐 되돌아가는 어색한 순간이 사라지는지
