## 차수 1

### 작업내용

- `/mockdata` 데모 흐름을 기존 정적 저품질 페이지 묶음에서 벗어나 현재 실제 구현된 홈/학생관리/출석보드/가져오기 플로우를 반영하는 현실적인 데모 앱으로 재구성한다.
- landing의 `데모 보기` 진입점은 유지하되, `/mockdata/app` 기준으로 실제 현재 프로덕트 레이아웃을 닮은 seeded demo state를 보여주도록 바꾼다.
- 오래된 `/mockdata/empty`, `/recording`, `/result`, `/students`, `/students/detail` 류의 분절된 정적 데모 페이지는 제거 또는 라우트 정리 대상으로 본다.
- 데모 데이터는 현재 구현된 student-management / counseling workspace / check-board / import 흐름에 맞는 space, member, counseling record, student board 상태를 갖게 한다.

### 논의 필요

- mockdata를 완전히 현재 앱 재사용 구조로 만들면 실제 앱 로직과 fixture 경계가 더 복잡해질 수 있다.
- 너무 정교하게 실데이터처럼 만들면 유지보수 비용이 커지므로, 우선은 “현재 제품 시나리오를 잘 보여주는 seed set” 중심으로 간다.

### 선택지

1. `/mockdata`를 현재 제품 구조를 닮은 단일 realistic demo app으로 재구성한다.
2. 기존 분절된 데모 페이지를 유지하되 데이터만 최신화한다.

### 추천

- 1번. 현재 문제는 데이터 낡음뿐 아니라 화면 구조 자체가 실제 제품과 다르다는 점이므로, 단순 데이터 교체로는 품질 문제가 해결되지 않는다.

### 사용자 방향
