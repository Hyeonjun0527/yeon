# 작업-codex | yeon.world 인증 장애 원인 추적

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: _(확인 중)_
- 작업창(예상): 15:27 ~ 16:00
- 실제 시작: 15:27
- 실제 종료: 15:30
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)
- 읽기: 인증 관련 앱/패키지/배포 설정, 라이브 HTTP 응답
- 쓰기: 이 작업 로그만

## 절대 건드리지 않을 범위 (상대 주체 담당)
- 원인 진단 전 코드 수정 없음

## 상대 주체 현황 스냅샷
- 2026-04-30 로그 없음, 2026-04-29 작업중 로그 없음

## 차수별 작업내용
- 1차: 라이브 yeon.world 인증 실패 재현
- 2차: 인증 구현/배포 환경 설정 대조
- 3차: 원인 후보와 최소 조치 정리

### 1차 관측
- `https://yeon.world/api/v1/auth/session`은 200 `{authenticated:false}`.
- `/api/auth/google`, `/api/auth/kakao`는 각각 Google/Kakao OAuth 페이지로 307 redirect 생성 성공.
- `/api/auth/credentials/login`에 유효한 shape의 존재하지 않는 계정으로 POST 시 500 반환. 정상이라면 401 invalidCredentials여야 함.

### 2차 원인 근거
- GitHub Actions `Build, Push, and Deploy Docker Image` main run `24887480837`가 2026-04-24 11:59 UTC production deploy에서 실패.
- 실패 위치: web image pull/up 이후 `Run DB migrations` 단계.
- 0027 `users_email_unique` 적용 중 `Key (email)=(wschoi809@naver.com) is duplicated.`로 실패.
- 따라서 0028~0032 미적용. 특히 0031의 `login_attempts`, `password_credentials`, `email_verification_tokens`, `password_reset_tokens`, `users.email_verified_at`가 prod DB에 없을 가능성이 큼.

### 결론
- 현재 yeon.world는 새 인증 코드가 배포됐지만 DB 마이그레이션이 중간 실패한 code/schema mismatch 상태.
- 이메일 가입/로그인은 0031 테이블을 사용하므로 500 발생.
- 소셜 로그인도 같은 인증 DB/사용자 중복 데이터 문제 및 세션 생성 흐름에 걸릴 수 있음.
