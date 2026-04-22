# image import Google Vision OCR hardening BACKLOG

작성일: 2026-04-11  
상태: 진행중

---

## 1차: 이미지 OCR 추출 경로 도입

### 작업내용

- PNG/JPG 이미지 업로드 시 Google Vision OCR을 먼저 호출한다.
- OCR 결과를 행/열 구조로 복원할 수 있는 서버 전용 service를 추가한다.
- OCR 인증 정보가 없을 때는 명확한 운영 오류로 실패시킨다.

### 논의 필요

- API key 기반으로 시작할지 service account 기반까지 함께 열어둘지

### 선택지

A. GOOGLE_VISION_API_KEY만 지원  
B. API key + service account bearer 둘 다 지원

### 추천

B — 운영 환경별로 막히지 않도록 초기부터 둘 다 열어두는 편이 안전하다.

### 사용자 방향

---

## 2차: 표 구조 복원 + 정규화 + fail-fast

### 작업내용

- OCR 결과를 표 형태 rows로 복원한다.
- customFields 값을 모두 string/null로 정규화한다.
- 핵심 필드 누락/행 수 부족/헤더 불안정 시 낮은 신뢰도로 간주하고 자동 import를 중단한다.

### 논의 필요

- confidence 임계값 수치

### 선택지

A. 단순 필수 이름 필드 기준 fail-fast  
B. 헤더/행/핵심컬럼 점수를 합산한 confidence 기반 fail-fast

### 추천

B — 실제 스크린샷 표는 부분 누락이 흔해서 복합 점수가 더 안전하다.

### 사용자 방향

---

## 3차: 재요청 시 원본 이미지 재해석

### 작업내용

- 수정 요청이 들어오면 이전 preview JSON만 수정하지 않고 원본 이미지 OCR/재구성을 다시 실행한다.
- 이전 결과는 보조 컨텍스트로만 사용하고 source of truth는 항상 원본 이미지와 OCR 텍스트로 둔다.
- 누락 열 보강 요청에 대해 원본 기반 재추출이 가능하도록 prompt를 재설계한다.

### 논의 필요

- 없음

### 선택지

A. 기존 preview 수정 중심  
B. 원본 이미지 재추출 중심

### 추천

B — 사용자의 기대와 실제 수정 정확도 모두 이쪽이 맞다.

### 사용자 방향

---

## 4차: 회귀 테스트

### 작업내용

- 숫자 custom field 문자열 정규화 테스트
- 이미지 OCR 결과의 행/열 복원 테스트
- confidence 낮을 때 fail-fast 테스트
- 재요청 시 이전 preview 수정이 아니라 원본 OCR 재해석 경로를 타는 테스트

### 논의 필요

- 없음

### 선택지

A. service unit test 위주  
B. route + service 조합 회귀 포함

### 추천

B — 실제 실패 지점이 route/service 경계와 스키마 검증 사이에 있으므로 함께 검증해야 한다.

### 사용자 방향
