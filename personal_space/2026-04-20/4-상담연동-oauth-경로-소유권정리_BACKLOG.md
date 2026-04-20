# 상담 연동 OAuth 경로 · 소유권 정리 백로그

## 차수 1

### 작업내용

- Google Drive, OneDrive 연동 OAuth의 외부 callback URI를 `yeon.world/counseling-service/api/...` 기준으로 통일한다.
- OAuth callback 완료 후 복귀 경로를 `/counseling-service/student-management`로 맞춘다.
- 루트 auth와 `counseling-service` API 소유권 및 redirect 규약을 문서로 정리한다.
- 관련 단위 테스트를 추가해 루트/서비스 경계가 다시 깨지지 않게 한다.

### 논의 필요

- Google, Microsoft 콘솔에 등록된 redirect URI를 새 서비스 경로로 언제 교체할지 운영 타이밍 확인이 필요하다.

### 선택지

- 선택지 A: 루트 `/api/v1/integrations/.../auth/callback`를 계속 유지하고 문서만 정리한다.
- 선택지 B: 외부 공개 callback URI를 `/counseling-service/api/v1/integrations/.../auth/callback`로 바꾸고 proxy rewrite로 내부 handler를 계속 재사용한다.

### 추천

- 선택지 B
- 이유: 상담 연동은 `counseling-service` 소유로 명확히 드러나야 하고, 지금 proxy가 이미 `/counseling-service/api/* -> /api/*`를 지원하므로 외부 URL만 장기 구조에 맞추는 편이 유리하다.

### 사용자 방향
