# Long audio transcription hour support 백로그

## 차수 1

### 작업내용

- 1시간 수준의 긴 상담 음성도 OpenAI 전사 모델 제한에 걸리지 않도록 서버에서 안전하게 chunked transcription으로 강제 진입시킨다.
- client가 `audioDurationMs`를 보내지 않거나 잘못 보내도, 서버가 자체적으로 duration을 추정하거나 모델-limit 에러를 감지해 chunk fallback을 수행하게 만든다.
- home 파일 업로드와 counseling workspace 업로드 경로 모두 같은 long-audio 보호 규칙을 공유한다.
- 관련 단위 테스트를 추가해 long-duration 입력이 chunk path로 빠지는지 회귀 방지한다.

### 논의 필요

- ffprobe를 직접 의존할지, ffmpeg만으로 duration을 읽을지, 또는 OpenAI limit 에러 기반 fallback만 둘지 운영 환경 제약을 확인할 필요가 있다.
- diarize 모델 사용 시 chunk duration 120초 제한을 유지할지, 모델별로 더 세분화할지 후속 판단이 필요하다.

### 선택지

1. 업로드 클라이언트가 항상 duration을 보내도록만 보완한다.
2. 서버가 duration 누락/오류를 스스로 보정하고, limit 에러 시 chunk fallback까지 수행한다.

### 추천

- 선택지 2
- 긴 음성 처리 안정성은 클라이언트 메타데이터에만 의존하면 안 된다. source of truth는 서버가 가져야 하고, 특히 1시간 녹음처럼 실패 비용이 큰 경우엔 서버 fallback까지 갖는 편이 안전하다.

### 사용자 방향
