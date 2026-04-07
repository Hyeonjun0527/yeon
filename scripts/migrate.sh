#!/usr/bin/env bash
# 배포 시 DB 마이그레이션을 자동 실행하는 스크립트.
# Drizzle의 __drizzle_migrations 테이블로 적용 여부를 추적한다.
#
# 사용법: DEPLOY_DIR=/srv/yeon COMPOSE_FILE=compose.prod.yml ./scripts/migrate.sh
#
# 필수 환경변수:
#   DEPLOY_DIR     — docker compose 가 실행되는 디렉터리 (.env 포함)
#   COMPOSE_FILE   — 사용할 compose 파일 이름

set -euo pipefail

MIGRATION_DIR="apps/web/src/server/db/migrations"

if [ ! -d "${MIGRATION_DIR}" ]; then
  echo "마이그레이션 디렉터리를 찾을 수 없습니다: ${MIGRATION_DIR}"
  exit 1
fi

# .env에서 DB 접속 정보 읽기
source "${DEPLOY_DIR}/.env"
DB_USER="${POSTGRES_USER:-yeon}"
DB_NAME="${POSTGRES_DB:-yeon}"
DB_SERVICE="db"

# compose 프로젝트 이름 추출 (compose.yml의 name 필드)
COMPOSE_PROJECT="$(grep -m1 '^name:' "${DEPLOY_DIR}/${COMPOSE_FILE}" | awk '{print $2}' || true)"
DB_CONTAINER="${COMPOSE_PROJECT:+${COMPOSE_PROJECT}-}${DB_SERVICE}-1"

echo "=== DB 마이그레이션 시작 (컨테이너: ${DB_CONTAINER}) ==="

# __drizzle_migrations 테이블이 없으면 생성
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -q -c "
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id serial PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );
"

# 이미 적용된 마이그레이션 해시 목록
applied=$(docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAq -c \
  "SELECT hash FROM __drizzle_migrations ORDER BY id;")

for sql_file in "${MIGRATION_DIR}"/*.sql; do
  filename="$(basename "${sql_file}" .sql)"
  hash="${filename}"

  if echo "${applied}" | grep -qxF "${hash}"; then
    echo "  ✓ 이미 적용됨: ${filename}"
    continue
  fi

  echo "  ▶ 적용 중: ${filename}"

  # --> statement-breakpoint 를 기준으로 분리하지 않고 전체를 한번에 실행
  # Drizzle이 생성하는 SQL은 트랜잭션 안전함
  sql_content="$(cat "${sql_file}" | sed 's/--> statement-breakpoint//g')"

  docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<EOSQL
BEGIN;
${sql_content}
INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', $(date +%s)000);
COMMIT;
EOSQL

  echo "  ✓ 완료: ${filename}"
done

echo "=== DB 마이그레이션 완료 ==="
