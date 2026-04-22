# Import analysis backend stage pipeline 백로그

## 차수 1

### 작업내용

- 로컬/OneDrive/Google Drive 파일 분석 가져오기 흐름을 synthetic SSE 문구 기반에서 실제 backend stage 기반으로 전환한다.
- `import_drafts`에 coarse status(`analyzing/analyzed`) 외에 실제 진행 단계를 저장할 필드를 추가한다.
- `file-analysis-service`가 실제 작업 경계(파일 읽기, 텍스트 추출, 구조 분석, 수강생 추출, 수정 반영, 결과 정리)에 맞춰 stage 이벤트를 발생시키게 만든다.
- analyze route와 SSE 스트림은 같은 persisted stage source of truth를 사용하게 하고, 복구/새로고침 후에도 현재 stage를 그대로 보여주게 한다.
- import UI는 `streamingText` 문자열 하나 대신 stage/progress/message를 기준으로 체크리스트를 렌더링한다.

### 논의 필요

- refine(후속 수정 요청) 흐름도 같은 stage 체계를 재사용하되, 별도 wording을 둘지 공통 wording을 둘지 정리가 필요하다.
- profile import 같은 one-shot AI 추출도 이후 staged draft 모델로 올릴지 범위를 나눌 필요가 있다.

### 선택지

1. 현재 draft status는 유지하고 SSE 문구만 조금 더 그럴듯하게 만든다.
2. draft status는 coarse 상태로 유지하되, 실제 backend processing stage/progress/message를 별도 필드로 추가해 UI가 그 값을 읽게 만든다.

### 추천

- 선택지 2
- 이미 import draft 복구 구조가 있으므로 별도 작업 큐를 새로 만들 필요는 없다. 현재 draft를 source of truth로 확장해 counseling records처럼 persisted stage를 들고 가는 편이 가장 안전하고, 새로고침/복귀 UX도 바로 해결된다.

### 사용자 방향
