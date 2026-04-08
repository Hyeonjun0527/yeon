#!/usr/bin/env bash
# Benchmark: Next.js web app build time (wall clock seconds)
# Output: JSON on last line with primary metric
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Clean .next cache for consistent measurement
rm -rf apps/web/.next

START=$(date +%s%N)
pnpm --filter @yeon/web build > /dev/null 2>&1
END=$(date +%s%N)

# Calculate elapsed time in seconds with 2 decimal places
ELAPSED=$(echo "scale=2; ($END - $START) / 1000000000" | bc)

echo "{\"primary\": $ELAPSED, \"build_time_seconds\": $ELAPSED}"
