# 13. chat-service secure-store web 폴백

## 차수 1

### 작업내용
- Expo web 프리뷰에서 `expo-secure-store` 미지원으로 세션 복원이 깨지는 문제를 수정한다.
- web에서는 `localStorage`, 그 외 비지원 환경에서는 메모리 폴백을 사용하게 만든다.
- 세션 bootstrap 단계가 저장소 예외로 전체 화면을 깨지 않도록 안전하게 처리한다.

### 논의 필요
- web 프리뷰 세션을 `localStorage`에 두는 것이 충분한지, 별도 브라우저 세션 스코프 정책이 필요한지 추후 검토가 필요하다.

### 선택지
- A. web에서만 `localStorage`, 기타 예외 환경은 메모리 폴백
- B. 모든 환경에서 `SecureStore` 실패 시 즉시 세션 미사용 처리

### 추천
- A. Expo web 프리뷰 경험을 유지하면서도 네이티브 iOS/Android는 기존 `SecureStore`를 그대로 쓸 수 있다.

### 사용자 방향

