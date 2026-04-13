# 38-ghcr-lowercase-image-name_BACKLOG

## 작업내용

- Docker workflow에서 GHCR 이미지 이름 생성 시 저장소 owner를 소문자로 정규화한다.
- `amd64` 빌드, `arm64` 빌드, manifest 병합 단계가 모두 동일한 소문자 이미지 ref를 사용하도록 맞춘다.

## 논의 필요

- 없음

## 선택지

- A. workflow 각 job에서 owner를 소문자로 계산해 step output으로 공유
- B. GitHub repository owner 이름을 외부에서 강제로 소문자로 변경한다고 가정

## 추천

- A. GHCR 규칙은 workflow 안에서 방어적으로 처리하는 편이 안전하고 재현 가능하다.

## 사용자 방향

- GHCR 이미지 ref를 항상 소문자로 생성
