# web Drizzle DB setup backlog

## 차수 1

### 작업내용
- `apps/web`에 PostgreSQL + Drizzle ORM/Drizzle Kit 기준 DB source of truth를 세운다.
- `src/server/db` 아래에 schema, client, migration runner 진입점을 만든다.
- `apps/web/package.json`에 DB 생성/적용/스튜디오 스크립트를 추가한다.
- `.env.example`에 DB 연결값을 정리한다.

### 논의 필요
- 실제 운영 DB provider를 Neon/Supabase/RDS 중 무엇으로 둘지
- migration 적용 주체를 CI/CD로 고정할지, 수동 운영 명령으로 남길지
- 초기 schema에 auth/user까지 같이 넣을지, 빈 예시 테이블만 둘지

### 선택지
- A. Drizzle schema + SQL migration + `postgres` 드라이버로 최소 스캐폴드만 먼저 도입
- B. Prisma처럼 schema 관리와 client 생성을 한 번에 가져간다
- C. Flyway처럼 SQL migration 도구를 별도로 두고 앱 코드는 쿼리 레이어만 둔다

### 추천
- A. 현재 저장소는 Next.js 중심 TS 모노레포이고 `apps/web/src/server/db` 경계가 이미 존재하므로, DB schema와 migration source of truth를 같은 런타임 안에 두는 편이 단순하다.

### 사용자 방향

## 차수 2

### 작업내용
- 첫 도메인 기능이 정해지면 그 기능 기준 실제 테이블/인덱스/제약조건을 추가한다.
- route handler -> service -> repository -> DB 흐름을 한 기능 단위로 연결한다.
- 필요 시 seed, test DB, CI migration 절차를 보강한다.

### 논의 필요
- 트랜잭션 경계를 repository에서 닫을지 service에서 닫을지
- soft delete, createdBy 같은 공통 컬럼 정책을 초기에 표준화할지

### 선택지
- A. 기능별로 schema 파일을 나눠 점진적으로 확장
- B. 초기에 공용 베이스 테이블 정책까지 한 번에 도입

### 추천
- A. 지금은 기능 요구가 비어 있으므로 DB 공통 정책을 성급히 굳히지 않고, 첫 실제 유스케이스가 생길 때 규칙을 확정한다.

### 사용자 방향
