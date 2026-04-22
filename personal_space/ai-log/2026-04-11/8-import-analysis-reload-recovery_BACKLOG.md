## 차수 1

### 작업내용

- 스프레드시트 import 분석 흐름을 메모리 상태가 아닌 서버 기반 draft session으로 전환한다.
- 분석 시작, 분석 완료, preview 수정 상태를 draft에 저장하고 새로고침 후 같은 draft를 복구한다.
- local/cloud import 공통으로 draft 복구 진입점을 연결하고, import 완료 시 draft를 정리한다.

### 논의 필요

- local 파일 원본을 서버에 임시 보관할지, 분석 결과/편집본만 보관할지 정책 확정이 필요하다.
- draft 만료 기간과 개인정보 보관 문구를 이번 차수에 함께 노출할지, 내부 정책만 먼저 둘지 결정이 필요하다.

### 선택지

- 선택지 1: localStorage와 query cache만 유지해 같은 브라우저에서만 복구한다.
- 선택지 2: 서버 draft를 source of truth로 두고 local 저장은 최근 draft 복귀용 안전망으로만 사용한다.

### 추천

- 선택지 2

### 사용자 방향

- 서버 draft session 중심으로 진행하고, 새로고침 후에도 분석/수정 중인 작업을 이어서 복구하는 방향으로 구현한다.
