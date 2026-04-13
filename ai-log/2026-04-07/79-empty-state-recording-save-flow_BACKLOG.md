# 79차: 빈 상태에서 브라우저 녹음 → 저장 플로우 연결

## 배경

빈 상태(records 0건)에서 "브라우저 녹음" CTA를 누르면 `startRecording()`은 호출되지만,
빈 상태 화면에는 녹음 진행 UI·저장 폼이 없어서 녹음 후 저장이 불가능하다.
파일 업로드도 동일 — 파일 선택 후 폼이 보이지 않는다.

녹음/업로드 폼은 workspace 분기(`records.length > 0`) 안의 `isUploadPanelOpen` 패널에만 존재한다.

## 작업내용

1. 빈 상태 조건에 `&& !isUploadPanelOpen` 추가 → 업로드 패널이 열리면 workspace 뷰로 전환
2. 빈 상태 "브라우저 녹음" onClick에 `setIsUploadPanelOpen(true)` 추가
3. 빈 상태 "파일 업로드" onClick에 `setIsUploadPanelOpen(true)` 추가
4. file input을 조건 분기 밖으로 이동 → 뷰 전환 시에도 ref가 유지되도록

## 논의 필요

- 없음. 기존 업로드 패널 UI를 그대로 재사용.

## 선택지

- A: 빈 상태 안에 녹음 UI·폼을 별도 구현 → 코드 중복
- B: 빈 상태 조건 수정으로 기존 업로드 패널 재사용 → 최소 변경

## 추천

B — 기존 업로드 패널에 녹음 진행 UI·폼이 이미 완비되어 있으므로 조건만 수정.

## 사용자 방향

(추천 기준 진행)
