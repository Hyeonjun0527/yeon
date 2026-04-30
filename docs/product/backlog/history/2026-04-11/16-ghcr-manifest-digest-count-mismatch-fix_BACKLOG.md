# 16-ghcr-manifest-digest-count-mismatch-fix BACKLOG

## 차수 1

### 작업내용

- GitHub Actions `docker-image.yml`의 `publish_manifest` 단계에서 digest artifact 수집 방식과 기대 개수 계산 로직을 점검한다.
- 실제 산출물 수가 늘어도 정상적으로 multi-arch manifest를 publish하도록 artifact 필터링 또는 검증 조건을 수정한다.
- 변경 후 로컬에서 workflow 스크립트 단위 검증과 관련 프로젝트 검증을 수행한다.

### 논의 필요

- digest artifact 개수 검증을 엄격히 유지할지, publish 가능한 digest만 선별하는 방향으로 완화할지 결정이 필요하다.
- 운영/개발 브랜치별 태그 전략이 digest 산출물 개수에 영향을 주는지 함께 확인해야 한다.

### 선택지

1. 현재 기대 개수 계산식을 수정해 실제 artifact 생성 수와 일치시킨다.
2. manifest publish 단계에서 digest 형식 파일만 필터링하고 나머지 summary artifact는 무시한다.
3. build 단계 artifact naming 자체를 바꿔 publish 단계 입력을 단순화한다.

### 추천

- 2번을 우선 적용한다. publish 단계는 manifest 조합에 필요한 digest만 source of truth로 삼아야 하고, summary/metadata artifact 증가에 덜 취약하기 때문이다.

### 사용자 방향
