# 4-gitignore-index-cleanup_BACKLOG

## 현재 상태

- workspace별 `node_modules`가 `.gitignore`에서 빠져 있어 `apps/web/node_modules`, `packages/*/node_modules`가 스테이징되어 있다.
- Python 실행 부산물인 `__pycache__`, `*.pyc`도 ignore되지 않아 `.codex/skills/ui-ux-pro-max/scripts/__pycache__`가 함께 스테이징되어 있다.
- 현재 작업트리에는 실제 소스 변경과 생성물이 섞여 있어, 그대로 두면 불필요한 파일이 커밋 범위에 포함될 수 있다.

## 목표 상태

- 모노레포 전역에서 생성되는 의존성 디렉터리와 캐시 파일이 기본적으로 ignore된다.
- 이미 스테이징된 생성물은 작업트리 파일은 유지한 채 인덱스에서만 제거된다.
- 실제로 버전 관리가 필요한 소스 변경만 스테이징 상태에 남는다.

## 1차

### 작업내용

- 현재 `.gitignore` 누락 패턴 보강
- workspace별 `node_modules`, Python 캐시, 일반 빌드 산출물 ignore 정리
- 이미 올라간 생성물 인덱스 정리

### 논의 필요

- `.claude`, `.codex` 전체를 저장소에 남길지, 생성물만 제외할지

### 선택지

- A. `.claude`, `.codex` 전체를 ignore
- B. 운영 메모리는 유지하고 생성물만 ignore

### 추천

- B. 운영 메모리 파일은 유지하고 생성물만 정확히 제외

### 사용자 방향


## 2차

### 작업내용

- 정리 후 `git status`, ignored 매칭 여부 확인
- 남아 있는 스테이징 파일 중 추가 ignore 후보가 있는지 점검

### 논의 필요

- 향후 IDE/OS별 로컬 파일 패턴을 더 넓게 추가할지

### 선택지

- A. 현재 확인된 패턴만 최소 반영
- B. 일반적인 로컬 개발 부산물까지 한 번에 반영

### 추천

- B. 현재 저장소 구조에 맞는 범위에서 일반적인 부산물까지 함께 반영

### 사용자 방향
