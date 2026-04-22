# 상담 기록 워크스페이스 UI 오버홀 구현 1차

## 입력 설계 문서

- 64: 헤더 슬림화
- 65: 빈 상태 셸
- 66: 1차 CTA 블록
- 67: 생성 폼 점진적 노출
- 68: 추가 정보 디스클로저
- 69: 선택 오디오 미리보기
- 70: 녹음 마이크로플로우
- 71: 좌측 IA 단순화

## 차수 1: TSX 상태/핸들러 + JSX + CSS 전면 재작성

### 작업내용

1. `isFinalizingRecording`, `isAdditionalInfoOpen` 상태 추가
2. 녹음 `stop` 핸들러에 `finalizing` 중간 상태 삽입
3. 저장 성공 후 전체 폼 reset (sessionTitle만이 아니라 전부)
4. `applySelectedAudioFile`에서 success 메시지 제거 (카드가 대체)
5. 헤더: 메트릭 3개 제거, ghost 로그아웃, 1줄 보조 문구
6. 사이드바: createSection + browseSection 2영역 구조
7. 생성 패널: CTA 타일 → 오디오 확인 → 학생 이름 → 추가 정보 디스클로저 → 저장
8. 선택 전: AI 패널 제거, 단일 preSelectionShell
9. CSS: topbar 공통 패널에서 분리, 새 클래스 추가, 미사용 클래스 제거

### 논의 필요

- 없음. 설계 문서에서 이미 결정 완료.

### 선택지

- A. 설계 문서 기준 전면 재작성
- B. 점진적 부분 수정

### 추천

- A

### 사용자 방향

- A. 전면 재작성. "코드 품질이 너무 안좋다"는 피드백.
