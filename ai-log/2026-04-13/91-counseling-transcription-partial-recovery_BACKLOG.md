# 91. 상담 전사 partial recovery와 누락 chunk 재시도

## 작업내용

- 전사 중 일부 chunk가 실패해도 성공한 chunk는 partial transcript로 즉시 저장한다.
- `transcriptionChunks`를 기반으로 누락 chunk만 재시도하도록 재전사 로직을 바꾼다.
- partial transcript 상태에서는 AI 분석/요약/채팅을 차단하고, UI에서 부분 전사 완료와 누락 chunk 재시도를 명확히 보여준다.
- 관련 API 계약, processing stage, 테스트를 함께 정리한다.

## 논의 필요

- partial transcript 상태를 별도 `status`로 분리할지, 기존 `status=processing` + `processingStage=partial_transcript_ready` 조합으로 표현할지
- 누락 chunk 재시도 횟수/상한을 이번 차수에 포함할지

## 선택지

1. 새 DB 컬럼 없이 `processing + partial_transcript_ready` 조합으로 구현
2. `partial_ready` 같은 새 status를 계약 전반에 추가
3. partial transcript는 저장하지 않고 누락 chunk 재시도만 지원

## 추천

- 1번. 상태모델 변경 범위를 최소화하면서 partial transcript와 누락 chunk 재시도 UX를 바로 열 수 있다.

## 사용자 방향
