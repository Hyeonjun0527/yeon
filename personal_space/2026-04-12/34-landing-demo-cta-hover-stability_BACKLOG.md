## 1차

### 작업내용

- 랜딩 `데모 보기` CTA에서 hover 중 커서가 pointer/default 사이를 빠르게 왕복하는 원인을 추적한다.
- hover transform, pseudo-element, shadow 변화 중 실제 hit area를 흔드는 요소를 특정한다.
- CTA의 시각 강조는 유지하되 hover 중 버튼 박스 자체가 이동하지 않도록 안정화한다.
- 수정 후 lint, format, typecheck, build로 회귀 여부를 검증한다.

### 논의 필요

- 현재 flicker가 pseudo-element 경계 때문인지 hover translate 때문인지 우선 증거 확인이 필요하다.
- hover 상승 연출을 제거할지, 별도 wrapper로 흡수할지 결정이 필요하다.

### 선택지

1. hover translate 제거 후 색/그림자만 유지
   - 장점: 커서 경계 흔들림을 가장 직접적으로 제거한다.
   - 단점: 버튼의 떠오르는 모션은 줄어든다.
2. wrapper를 두고 내부만 transform
   - 장점: 모션은 유지할 수 있다.
   - 단점: 마크업과 hit area 구조가 더 복잡해진다.

### 추천

- 현재 문제는 인터랙션 안정성이 우선이므로 먼저 선택지 1로 최소 수정한다.
- 이후 디자인상 모션이 꼭 필요하면 별도 wrapper 기반으로 다시 설계한다.

### 사용자 방향
