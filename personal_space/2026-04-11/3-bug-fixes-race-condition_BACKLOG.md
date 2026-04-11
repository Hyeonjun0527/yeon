# BACKLOG: 잠재 버그 4종 수정

**작성일**: 2026-04-11  
**브랜치**: `feat/counseling-records-real-api` (현재 작업 브랜치 기준)  
**대상 파일**:

- `apps/web/src/app/home/_hooks/use-records.ts`
- `apps/web/src/app/home/_hooks/use-ai-chat.ts`
- `apps/web/src/features/student-management/components/profile-import-panel.tsx`

---

## 배경 및 논리적 분석

이 백로그는 `/bug-repo` 스킬로 탐지된 4개 잠재 버그에 대해 코드 흐름을 상세히 추적하고, 발생 조건과 수정 방향을 명확히 정의하기 위해 작성한다. 단순 "고쳐야 한다"는 결론이 아니라 **왜 버그가 생기는지, 어떤 조건에서 발현되는지, 수정이 다른 흐름을 깨뜨리지 않는지**를 검증하는 것이 목표다.

---

## 버그 1 (P1) — `syncFromServer` stale snapshot으로 analysisResult 덮어쓰기

### 코드 흐름 재구성

`use-records.ts`의 `syncFromServer`는 다음 패턴으로 동작한다:

```
1. fetch("/api/v1/counseling-records") 비동기 시작
2. (네트워크 왕복 시간 경과)
3. fetch 완료 → const prev = recordsRef.current 캡처
4. items를 prev 기반으로 병합하여 merged 배열 생성
5. setRecords(merged) 호출 — concrete value를 직접 전달
```

`use-ai-chat.ts`의 자동 분석 흐름:

```
1. selectedId 변경, analysisResult === null 감지
2. analysisAttemptedRef.add(id)
3. fetch("/api/v1/.../analyze") POST 비동기 시작
4. (AI 분석 시간 경과 — 수 초~수십 초)
5. 완료 → onUpdateAnalysisResult(id, result)
6. → setRecords(prev => prev.map(r => r.id === id ? {...r, analysisResult: result} : r))
```

### 레이스 윈도우

```
T=0       : 폴링 setInterval 발화, syncFromServer 진입
T=10ms    : fetch() 전송
T=3000ms  : AI /analyze 완료 → onUpdateAnalysisResult → setRecords (functional updater)
             → React가 배치하여 re-render → recordsRef.current = updated (analysisResult 있음)
T=3200ms  : 폴링 fetch() 응답 도착
T=3201ms  : const prev = recordsRef.current 캡처 ← 이 시점이 핵심
```

만약 T=3201ms에 `recordsRef.current`가 업데이트된 상태라면 문제가 없다.  
하지만 React 렌더 사이클이 아직 완료되지 않았거나, 마이크로태스크 큐 처리 순서에 따라
`recordsRef.current`가 구버전을 가리킬 수 있는 경우:

```
T=3200ms  : 폴링 fetch() 응답 도착
T=3200ms  : const prev = recordsRef.current (아직 analysisResult: null 버전)
T=3200ms  : serverMerged 계산: existing.analysisResult ?? r.analysisResult = null ?? null = null
T=3201ms  : onUpdateAnalysisResult의 setRecords 완료 (analysisResult = {...})
T=3202ms  : syncFromServer의 setRecords(merged) 실행 — merged 안에 analysisResult: null
→ 분석 결과가 null로 되돌아감
```

### 근본 원인

`setRecords(merged)`는 **concrete value를 직접 넘기는 방식**이다. 이 방식의 문제:

- `merged`는 비동기 fetch 완료 시점의 `recordsRef.current` 스냅샷을 기반으로 계산된다
- 이후 React가 실제로 `setRecords(merged)`를 처리하는 시점에는 **다른 setRecords 호출이 이미 state를 업데이트했을 수 있다**
- React는 functional updater(`setRecords(prev => ...)`)에 대해 "항상 최신 state"를 보장하지만, concrete value 방식은 보장하지 않는다

### 증거

- `onUpdateAnalysisResult`: `setRecords(prev => prev.map(...))` — functional updater ✓ (이미 올바름)
- `syncFromServer`: `setRecords(merged)` — concrete value ✗ (문제)

### 발현 가능성

폴링 주기(3초)와 AI 분석 시간(수 초)이 겹치는 구간에서 발현된다. 사용자가 레코드를 선택하고 AI 분석이 진행 중인 상태에서 폴링이 발화하면 재현 가능. 네트워크 지연이 클수록 윈도우가 넓어진다.

### 수정 방향

`syncFromServer` 내부에서 상태 병합을 functional updater로 이동:

```ts
setRecords((currentRecords) => {
  const serverMerged = items.map(listItemToRecordItem).map((r) => {
    const existing = currentRecords.find((p) => p.id === r.id);
    if (!existing) return r;
    return {
      ...r,
      aiMessages: existing.aiMessages,
      transcript:
        existing.transcript.length > 0 ? existing.transcript : r.transcript,
      analysisResult: existing.analysisResult ?? r.analysisResult,
      audioUrl: existing.audioUrl ?? r.audioUrl,
    };
  });
  const serverIds = new Set(items.map((item) => item.id));
  const preservedRecords = currentRecords.filter(
    (p) =>
      !serverIds.has(p.id) &&
      (p.id.startsWith("temp-") || p.status === "processing"),
  );
  return [...preservedRecords, ...serverMerged];
});
```

`readyTransitioned` 감지는 side effect(fetchDetail, scheduleReadyTransition)를 위한 것이므로 `setRecords` 외부에서 `recordsRef.current`를 활용해 그대로 유지한다. 상태를 변경하는 것이 아니기 때문에 stale snapshot이어도 최악의 경우 `fetchDetail`이 한 번 더 호출되는 정도이며, `fetchDetail`은 idempotent하다.

### 주의사항

이 변경으로 `merged`를 계산하는 로직이 `setRecords` 콜백 내부로 이동된다. `recordsRef.current`를 외부에서 사용하던 코드가 제거되므로, `readyTransitioned`가 `recordsRef.current`를 사용하는 부분은 반드시 `setRecords` 밖에 남겨야 한다.

---

## 버그 2 (P2) — `profile-import-panel.tsx` setTimeout 미정리

### 코드 흐름 재구성

```ts
// handleSave 내부 (line 168-172)
setPhase("done");
onSaved?.();
setTimeout(() => {
  setPhase("idle");
  setSuggestions(null);
  setCheckedFields(new Set());
}, 2000);
```

이 setTimeout은 `handleSave` 내부의 try 블록 안에서 직접 호출된다. 어떤 ref에도 저장되지 않고, cleanup 메커니즘이 전혀 없다.

### 시나리오 분류

**시나리오 A: 컴포넌트 언마운트 (가장 위험)**

학생 상세 시트가 닫히거나 페이지가 이동되면 `ProfileImportPanel`은 언마운트된다. 이 경우 setTimeout 콜백이 2초 후 실행될 때 `setPhase`, `setSuggestions`, `setCheckedFields`를 호출하지만, 컴포넌트는 이미 언마운트된 상태다.

React 18에서는 언마운트된 컴포넌트의 setState 호출이 조용히 무시된다. Warning도 발생하지 않는다. 그러나 setTimeout 자체는 메모리에서 살아있으며, 등록된 클로저도 GC되지 않는다. 단기적으로는 메모리 누수이다.

**시나리오 B: 빠른 재저장 또는 중복 클릭**

사용자가 저장 버튼을 빠르게 두 번 클릭하면 (혹은 서버 응답이 빠른 경우) `handleSave`가 두 번 호출될 가능성이 있다. 현재 코드에서 phase가 `"saving"`일 때 버튼이 `disabled`되어 있으므로 이중 호출은 막힌다. 그러나 만약 제어 흐름이 바뀌면 두 개의 setTimeout이 누적될 수 있다.

**시나리오 C: 패널 닫기 → 2초 후 상태 리셋**

사용자가 저장 완료 후 성공 UI가 뜨는 동안 (done 단계) 패널 헤더를 클릭해서 접으면 (`open = false`), `{open && ...}` 내부의 UI는 사라지지만 `ProfileImportPanel` 컴포넌트 자체는 여전히 마운트 상태다. 2초 후 setTimeout이 `setPhase("idle")`을 호출해 phase를 "idle"로 리셋한다.

이 경우 상태 자체는 정상적으로 초기화되므로 다음번 열기 때 깨끗하게 시작할 수 있다. 그러나 이것이 "의도한 동작"인지가 불명확하다. 사용자가 패널을 닫는 행위가 "작업 완료 후 UI를 수동으로 초기화"를 의미한다면, reset()을 즉시 호출하는 것이 맞다.

**시나리오 D: reset() 호출 vs setTimeout 경쟁**

사용자가 done 단계에서 "취소" 버튼(없음)이나 다른 버튼을 눌러 `reset()`이 호출되면, reset은 즉시 phase를 idle로 바꾼다. 그러나 이미 등록된 setTimeout은 2초 후에 다시 idle로 바꾼다 — 중복 setState, 미미하지만 불필요한 렌더 발생.

### 근본 원인

`setTimeout` 반환값(타이머 ID)을 저장하지 않으므로 `clearTimeout`을 호출할 수 없다. 언마운트 시 cleanup도 불가능하다.

### 수정 방향

1. `resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)` 추가
2. `handleSave`에서 setTimeout 등록 전 기존 타이머 클리어
3. `reset()` 내부에서도 타이머 클리어
4. 언마운트 cleanup `useEffect` 추가

```ts
const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  return () => {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
  };
}, []);
```

---

## 버그 3 (P1) — replaceRecord + 폴링 경합으로 임시 레코드 중복

### 코드 흐름 재구성

`replaceRecord`가 호출되기 전후, 폴링의 타이밍에 따라 두 가지 시나리오가 존재한다.

**케이스 A: 정상 (폴링이 replaceRecord 이후 완료)**

```
T=0     : 업로드 완료 → replaceRecord("temp-xxx", realRecord) 호출
           setRecords: temp-xxx → realRecord 교체
           React re-render → recordsRef.current = [realRecord, ...]
T=100ms : 폴링 fetch 완료
           const prev = recordsRef.current → [realRecord, ...]
           serverIds = {realId}
           existing = prev.find(p => p.id === realId) → realRecord 찾음
           preservedRecords = prev.filter(p => !serverIds.has(p.id) && ...)
             → realId는 serverIds에 있으므로 제외
           merged = [...preservedRecords, ...serverMerged] → realRecord 1개 ✓
```

**케이스 B: 경합 (폴링 fetch가 replaceRecord보다 먼저 완료)**

```
T=0     : 폴링 fetch 시작
T=100ms : 업로드 완료 → 서버에 realId 생성
           replaceRecord("temp-xxx", realRecord) 아직 호출 안 됨
           (React의 비동기 setState 처리 지연)
T=200ms : 폴링 fetch 완료
           const prev = recordsRef.current → 아직 [tempRecord, ...] (replaceRecord 미반영)
           items = [{id: realId, ...}]  ← 서버가 이미 realId를 갖고 있는 경우
           serverMerged → realId 포함
           preservedRecords: tempRecord는 p.id.startsWith("temp-") → 포함!
           merged = [tempRecord, realRecord, ...] ← 중복!
T=201ms : replaceRecord setRecords 실행
           prev → [tempRecord, realRecord, ...]
           prev.map(r => r.id === "temp-xxx" ? realRecord : r)
           → [realRecord(교체됨), realRecord(원본), ...] ← 여전히 중복!
```

### 발현 조건 분석

이 케이스 B가 발현되려면:

1. 서버 업로드가 폴링 주기(3초) 이내에 완료될 것
2. 서버가 응답으로 새 레코드를 이미 반환할 것
3. React의 `replaceRecord` state 업데이트가 폴링 fetch 완료 이전에 반영되지 않을 것

조건 3은 React의 setState 배치 처리 및 비동기 실행 타이밍에 달려 있다. `replaceRecord`는 일반적으로 업로드 API 응답 콜백에서 호출되므로 마이크로태스크 처리 후 렌더된다. 폴링 fetch가 같은 이벤트 루프 사이클에서 완료되면 `recordsRef.current`가 아직 구버전일 수 있다.

실제 빈도는 낮으나 빠른 서버 + 느린 클라이언트 렌더 환경에서 재현 가능하다.

### 수정 방향

`syncFromServer`의 functional updater 전환(버그 1 수정)이 이루어지면, `preservedRecords` 로직도 `currentRecords` 기준으로 동작하게 된다. 그러나 근본적인 경합 자체는 해결되지 않는다.

추가로 `merged`에서 ID 기준 중복 제거 로직을 추가한다:

```ts
// merged에서 ID 중복 제거 — realId가 preservedRecords와 serverMerged 양쪽에 있을 경우 serverMerged 우선
const seen = new Set<string>();
const deduped = [...preservedRecords, ...serverMerged].filter((r) => {
  if (seen.has(r.id)) return false;
  seen.add(r.id);
  return true;
});
return deduped;
```

단, preservedRecords가 앞에 오므로 temp-xxx가 우선된다. serverMerged가 우선되어야 하므로 순서를 `[...serverMerged, ...preservedRecords]`로 바꾸되, seen Set에 먼저 추가되는 serverMerged 항목이 중복 시 우선 선택된다.

실제로는: `[...serverMerged, ...preservedRecords].filter(dedup)` 방식으로 serverMerged를 우선 take하고 preservedRecords는 serverIds에 없는 것만 추가하는 기존 로직과 동일한 효과다. 기존 로직(`prev.filter(!serverIds.has(p.id) && ...)`)이 이미 중복을 방지하도록 설계되어 있으므로, functional updater 적용으로 대부분 해결된다.

---

## 버그 4 (P2) — `fetchDetail`의 analysisResult 런타임 검증 없는 타입 단언

### 코드

```ts
// use-records.ts:106
const analysisResult =
  (data.record.analysisResult as AnalysisResult | null) ?? null;
```

### 문제점

`AnalysisResult`는 `packages/api-contract/src/counseling-records.ts`에 `analysisResultSchema`로 정의된 zod 스키마의 inferred type이다:

```ts
export const analysisResultSchema = z.object({
  summary: z.string(),
  member: z.object({
    name: z.string().nullable(),
    traits: z.array(z.string()),
    emotion: z.string(),
  }),
  issues: z.array(analysisIssueSchema),
  actions: analysisActionsSchema,
  keywords: z.array(z.string()),
});
```

`as AnalysisResult | null` 캐스팅은 TypeScript 컴파일러에게만 유효하다. 런타임에는 어떤 검증도 없다. 만약 서버가 다른 모양의 JSON을 반환하면 — 예를 들어 `summary` 필드가 없거나, `issues`가 배열이 아니거나, `actions.mentor`가 없는 경우 — 타입 캐스팅은 성공하지만 UI 컴포넌트가 `analysisResult.issues.map(...)` 같은 코드를 실행할 때 런타임 에러가 발생한다.

### 발현 조건

- DB 마이그레이션 중 일부 레코드에 구형 스키마의 `analysisResult`가 저장된 경우
- 서버 사이드 AI 분석 로직이 다른 필드명이나 구조로 응답하는 경우
- 개발 중 서버 코드가 변경되어 임시로 다른 구조를 반환하는 경우

### 수정 방향

`analysisResultSchema`가 이미 존재하므로 `safeParse`를 사용:

```ts
import { analysisResultSchema } from "@yeon/api-contract/counseling-records";

const raw = data.record.analysisResult;
const parsed = raw != null ? analysisResultSchema.safeParse(raw) : null;
const analysisResult = parsed?.success ? parsed.data : null;
```

이렇게 하면:

- 서버가 올바른 구조를 반환하면 → 정상 동작
- 서버가 잘못된 구조를 반환하면 → `null`로 처리, UI는 "분석 결과 없음" 상태로 표시
- 런타임 크래시 없음

---

## 차수별 작업 계획

### 1차수: 버그 1 + 3 — `use-records.ts` syncFromServer functional updater 전환

**작업 내용**:

- `syncFromServer` 내부에서 `const prev = recordsRef.current` 기반으로 계산한 `merged`를 직접 `setRecords(merged)` 하던 방식을 제거
- `setRecords(currentRecords => ...)` functional updater로 병합 로직 이동
- `readyTransitioned` 감지는 `recordsRef.current` 스냅샷 유지 (side effect 전용, 상태 변경 없음)
- 이로써 버그 1(analysisResult 덮어쓰기)과 버그 3(replaceRecord 경합)이 함께 해결됨

**논의 필요**: 없음. 기존 로직을 그대로 이동하는 리팩토링 수준.

**선택지**:

- A. functional updater로 이동 (권장)
- B. `analysisResult` 필드만 별도 상태로 분리 (과잉 복잡도)

**추천**: A  
**사용자 방향**: 추천대로 진행

**검증**:

- 기존 preserve 로직(`temp-`, `processing`) 동작 그대로인지 확인
- `readyTransitioned` 감지 로직이 여전히 외부에서 동작하는지 확인

---

### 2차수: 버그 2 — `profile-import-panel.tsx` setTimeout 정리

**작업 내용**:

- `resetTimeoutRef` 추가
- `handleSave`의 setTimeout을 ref로 관리
- `reset()` 내부에서 clearTimeout 추가
- 언마운트 cleanup useEffect 추가

**논의 필요**: 없음.

**선택지**:

- A. useRef + clearTimeout (권장)
- B. useEffect로 done phase 감지 후 타이머 등록 (간접적으로 동일한 효과, 더 선언적)

**추천**: A (기존 handleSave 구조를 최소 변경)  
**사용자 방향**: 추천대로 진행

---

### 3차수: 버그 4 — `fetchDetail` analysisResult safeParse

**작업 내용**:

- `use-records.ts`의 `fetchDetail`에서 `as AnalysisResult | null` 캐스팅 제거
- `analysisResultSchema.safeParse` 적용

**논의 필요**: 없음.

**선택지**:

- A. safeParse (권장)
- B. 수동 shape check (zod를 쓰는 프로젝트에서 불필요)

**추천**: A  
**사용자 방향**: 추천대로 진행

---

## 완료 기준

- [ ] `syncFromServer`가 functional updater를 사용하고, 기존 preserve/merge 로직 동일하게 동작
- [ ] `profile-import-panel.tsx`의 setTimeout이 ref로 관리되며 언마운트/reset 시 정리됨
- [ ] `fetchDetail`이 `analysisResultSchema.safeParse`를 사용하며 잘못된 응답에 null 반환
- [ ] typecheck, lint, build 통과
