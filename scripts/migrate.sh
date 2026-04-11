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

# 스크립트 위치 기준 절대 경로로 migrations 디렉터리를 찾는다.
# 어느 디렉터리에서 호출하든 동일하게 동작한다.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "${SCRIPT_DIR}")"
MIGRATION_DIR="${REPO_ROOT}/apps/web/src/server/db/migrations"

if [ ! -d "${MIGRATION_DIR}" ]; then
  echo "마이그레이션 디렉터리를 찾을 수 없습니다: ${MIGRATION_DIR}" >&2
  exit 1
fi

# .env에서 DB 접속 정보만 안전하게 추출한다.
# bash source 대신 grep을 사용해 특수문자·주석·공백 문제를 방지한다.
_env_val() {
  grep -E "^${1}=" "${DEPLOY_DIR}/.env" 2>/dev/null \
    | head -1 \
    | cut -d= -f2- \
    | sed "s/^['\"]//; s/['\"]$//" \
    | tr -d '\r'
}

DB_USER="$(_env_val POSTGRES_USER)"
DB_USER="${DB_USER:-yeon}"
DB_NAME="$(_env_val POSTGRES_DB)"
DB_NAME="${DB_NAME:-yeon}"

# docker compose exec 기반으로 DB 접근한다.
# container 이름 문자열 파싱 불필요 — 서비스명(db)으로 직접 접근한다.
COMPOSE=(docker compose -f "${DEPLOY_DIR}/${COMPOSE_FILE}" --project-directory "${DEPLOY_DIR}")

echo "=== DB 마이그레이션 시작 ==="

# DB가 실제로 연결 가능한 상태인지 최대 5분 대기한다.
# docker compose up --wait 를 써도 pg_isready 레벨 확인이 더 확실하다.
echo "DB 준비 대기 중..."
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" -q 2>/dev/null; then
    echo "DB 준비 완료 (${i}번째 시도)"
    break
  fi
  if [ "${i}" -eq 30 ]; then
    echo "DB 준비 타임아웃 (300초)" >&2
    exit 1
  fi
  sleep 10
done

# __drizzle_migrations 테이블이 없으면 생성
"${COMPOSE[@]}" exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" -q -c "
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id serial PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );
"

# 이미 적용된 마이그레이션 해시 목록
applied=$("${COMPOSE[@]}" exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" -tAq -c \
  "SELECT hash FROM __drizzle_migrations ORDER BY id;")

for sql_file in "${MIGRATION_DIR}"/*.sql; do
  filename="$(basename "${sql_file}" .sql)"
  hash="${filename}"

  if echo "${applied}" | grep -qxF "${hash}"; then
    echo "  ✓ 이미 적용됨: ${filename}"
    continue
  fi

  echo "  ▶ 적용 중: ${filename}"

  sql_content="$(sed 's/--> statement-breakpoint//g' "${sql_file}")"

  "${COMPOSE[@]}" exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<EOSQL
BEGIN;
${sql_content}
INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', $(date +%s)000);
COMMIT;
EOSQL

  echo "  ✓ 완료: ${filename}"
done

echo "=== DB 마이그레이션 완료 ==="
