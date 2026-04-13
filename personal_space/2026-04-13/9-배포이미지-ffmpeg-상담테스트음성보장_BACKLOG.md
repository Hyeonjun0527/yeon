# 9. 배포이미지 ffmpeg + 상담 테스트음성 보장 BACKLOG

## 차수 1. 배포 컨테이너에 전사 도구 보장

- 작업내용
  - Raspberry Pi 5 배포 서버에서 사용하는 Docker 이미지에 `ffmpeg` 패키지를 포함한다.
  - 런타임 컨테이너에서 `ffmpeg`, `ffprobe`를 모두 사용할 수 있게 보장한다.
- 논의 필요
  - 없음. 사용자가 배포 컨테이너 내부 보장을 명시함.
- 선택지
  - 선택지 A: 호스트 OS에만 수동 설치
  - 선택지 B: Docker 이미지에 패키지 포함
- 추천
  - 선택지 B. self-hosted runner + GHCR 배포 구조에서는 이미지가 source of truth여야 재현 가능하다.
- 사용자 방향
  - 배포 서버 안 컨테이너 이미지에 자동 포함

## 차수 2. 상담 테스트 음성 3종을 이미지에 실파일로 보장

- 작업내용
  - `voice-test-data`의 3개 샘플을 컨테이너 빌드 시 `apps/web/public/test-data`로 실복사한다.
  - symlink 의존 없이 이미지 안에서 바로 서빙되게 만든다.
- 논의 필요
  - 없음. 사용자 지정 3개 샘플로 고정.
- 선택지
  - 선택지 A: symlink 유지
  - 선택지 B: Docker 빌드 시 실파일 복사
- 추천
  - 선택지 B. standalone runner 이미지에서 symlink target 누락을 피할 수 있다.
- 사용자 방향
  - `test-counseling.mp3`
  - `상담기록_테스트음성_20분.mp3`
  - `test-bootcamp-counseling-1hour.mp3`

## 차수 3. 전사 실패 원인 노출 보강

- 작업내용
  - `ffmpeg ENOENT`, `ffprobe ENOENT`를 일반 실패와 분리해 더 명확한 메시지로 바꾼다.
  - 실패 카드가 “배포 이미지에 도구 없음”을 바로 드러내게 만든다.
- 논의 필요
  - 없음
- 선택지
  - 선택지 A: 서버 로그만 개선
  - 선택지 B: 서버 에러 메시지 + UI 실패 문구 둘 다 개선
- 추천
  - 선택지 B. 운영자가 화면에서 바로 원인을 이해할 수 있어야 재전사 반복을 줄일 수 있다.
- 사용자 방향
  -
