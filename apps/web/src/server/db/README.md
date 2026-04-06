# DB Layer

`apps/web/src/server/db`는 웹 서버의 DB source of truth를 둔다.

- `schema/`: Drizzle schema 정의
- `migrations/`: 생성된 SQL migration 이력
- `client.ts`: Drizzle DB client 진입점

## 운영 원칙

- schema 변경은 `db:generate`로 SQL migration을 만든 뒤 리뷰한다.
- 실제 DB 반영은 앱 부팅 시 자동 실행하지 않고 별도 배포 단계에서 `db:migrate`로 수행한다.
- `push` 계열 명령은 운영 반영 경로로 사용하지 않는다.
