# 37-native-multiarch-build-workflow_BACKLOG

## 작업내용

- GitHub Actions Docker 워크플로우를 `amd64`/`arm64` 네이티브 병렬 빌드 + manifest 병합 구조로 재구성한다.
- 최종 산출물 태그(`latest`, `develop`, `sha-*`)는 유지하면서 QEMU 멀티아키 단일 빌드 병목을 줄인다.
- deploy job은 단일 Docker build job 대신 manifest publish 완료를 기준으로 이어지게 조정한다.

## 논의 필요

- 없음

## 선택지

- A. `ubuntu-latest`에서 QEMU 멀티아키 단일 빌드 유지
- B. `amd64`와 `arm64`를 각 환경에서 네이티브로 빌드하고 마지막에 manifest 병합

## 추천

- B. 최종 결과물은 유지하면서도 가장 큰 병목인 QEMU 기반 `arm64` 빌드를 제거할 수 있어 체감 단축 폭이 크다.

## 사용자 방향

- 네이티브 병렬 빌드 + manifest 병합
