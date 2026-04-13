# 86-counseling-text-memo-create-500-fix BACKLOG

## 작업내용

### 1차

- 텍스트 메모 생성 `500` 재현 경로를 고정하고, `record_source` 스키마/마이그레이션 적용 여부를 확인한다.
- `text_memo`와 `demo placeholder`를 구분하는 현재 backend 변경이 실제 DB 상태와 맞물려 동작하는지 검증한다.

### 2차

- 필요한 경우 `counseling-records` service/repository와 관련 테스트를 수정해 텍스트 메모 생성 직후 상세 조회가 정상 완료되게 한다.
- 오디오 전용 동작만 제한하고, 텍스트 메모 자체는 일반 상담 기록처럼 열람 가능한 상태를 유지한다.

### 3차

- 로컬 재현, lint, typecheck, build, 관련 테스트를 수행하고 develop 머지까지 마무리한다.

## 논의 필요

- 현재 working tree에 이미 얹힌 `record_source` 관련 변경을 그대로 흡수할지, 최소 수정만 추가할지
- 로컬 DB 스키마 드리프트만으로 닫히는지, 아니면 service 상세 조회 경계에도 보완이 더 필요한지

## 선택지

- 선택지 A: 마이그레이션만 적용하고 코드 수정은 최소화한다.
- 선택지 B: 마이그레이션 적용 + service/repository/tests까지 함께 정리한다.

## 추천

- 선택지 B
- 이유: 현재 증상은 DB 스키마 드리프트가 가장 유력하지만, 텍스트 메모/데모 placeholder 분기 로직도 동시에 바뀌고 있어 재발 방지까지 닫으려면 코드와 테스트를 함께 고정하는 편이 안전하다.

## 사용자 방향
