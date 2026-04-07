---
name: review-repo
description: 현재 프로젝트 코드베이스를 점검하여 실제 리뷰 포인트를 최소 0개, 최대 10개 도출한다.
user_invocable: true
---

# Review Repo

현재 프로젝트의 코드베이스를 전체적으로 점검하고, 실제로 의미 있는 리뷰 포인트를 도출한다.

## 절대 원칙

- **억지로 10개를 채우지 않는다.** 실제로 문제가 있는 것만 보고한다.
- 최소 0개, 최대 10개. 문제가 없으면 "리뷰 포인트 없음"이라고 보고한다.
- 각 포인트는 반드시 구체적인 파일 경로와 라인 번호를 포함한다.
- 추측이나 가정이 아닌, 코드에서 직접 확인한 사실만 근거로 삼는다.

## 점검 기준 (CLAUDE.md / CLAUDE.local.md 기반)

아래 기준을 순서대로 점검하되, 해당 사항이 없으면 건너뛴다.

### Critical (즉시 수정 필요)
1. **상태 정합성**: 거짓 상태가 남을 수 있는 코드 — set/save/write가 있으면 delete/clear/reset도 확인
2. **source of truth 위반**: 같은 값이 여러 곳에 중복 정의되어 drift 가능성이 있는 경우
3. **server/client 경계 침범**: server-only 코드가 클라이언트 번들에 포함되거나 그 반대
4. **보안 취약점**: OWASP top 10 해당 사항 (injection, XSS 등)

### Major (품질에 영향)
5. **web/mobile 재사용 경계**: Server Action으로 닫아야 할 것을 public API 없이 구현
6. **API 계약 drift**: api-contract와 실제 구현 사이 불일치
7. **비동기 레이스 컨디션**: 순서 뒤집힘, 취소 누락, stale closure
8. **cleanup 누락**: 이벤트 리스너, 타이머, 구독 해제 빠짐

### Minor (개선 권장)
9. **workspace 경계 위반**: apps/packages 간 잘못된 의존 방향
10. **CSS Modules 제약**: 전역 셀렉터 단독 사용, dynamic Tailwind class

## 실행 절차

1. `apps/web/src/` 아래 주요 feature, component, server 코드를 탐색한다.
2. `packages/` 아래 코드가 있다면 함께 점검한다.
3. 위 점검 기준에 해당하는 실제 문제만 수집한다.
4. 각 포인트를 severity (critical/major/minor)로 분류한다.

## 출력 형식

```
## 리뷰 결과: N개 발견

### Critical
- **[제목]** `파일경로:라인` — 설명. 왜 문제인지, 어떤 상태가 깨지는지.

### Major
- **[제목]** `파일경로:라인` — 설명.

### Minor
- **[제목]** `파일경로:라인` — 설명.

(해당 severity에 포인트가 없으면 해당 섹션 생략)
```

해당 사항이 하나도 없으면:

```
## 리뷰 결과: 0개

현재 코드베이스에서 점검 기준에 해당하는 리뷰 포인트를 발견하지 못했습니다.
```
