# 6-google-sheet-conflict-detection-sync

## 작업내용

- Google Sheets 수강생 연동을 blind overwrite 방식에서 conflict-detection 방식으로 바꾼다.
- export 시 시트에 안정적인 row identity / sync metadata를 함께 기록한다.
- 서버에는 마지막 export 기준 base snapshot을 저장해 3-way compare가 가능하게 한다.
- import 시 `base / server current / sheet current`를 비교해 충돌을 감지한다.
- 충돌이 없을 때만 안전하게 반영하고, 충돌이 있으면 import를 중단하고 목록을 반환한다.
- 시트 연동 UI에서 충돌 결과를 표시하고 사용자에게 후속 조치를 안내한다.

## 논의 필요

- 1차 범위에서는 conflict resolver UI까지 가지 않고, conflict detect + block까지만 구현한다.

## 선택지

1. 현재처럼 blind overwrite 유지
2. row version만 추가하고 거친 차단만 수행
3. base snapshot + hidden metadata + 3-way compare로 conflict detect 구현

## 추천

- 3번. 실무적으로 가장 안전하고, Git 전체를 만드는 게 아니라 phase-1 수준의 conflict detect + block 구조라 구현 가능성과 안정성의 균형이 좋다.

## 사용자 방향

- 양쪽 변경이 동시에 일어나면 git처럼 충돌이 나야 한다.
- 어렵더라도 전체 구현 방향으로 진행한다.
