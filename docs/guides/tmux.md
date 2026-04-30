# tmux 사용법

## tmux가 뭐냐

터미널 안에서 **창을 나눠 쓰고, 꺼도 안 죽는 도구**. 터미널 창은 그냥 "창문"이고, 실제 프로그램은 tmux 서버 위에서 돌아가서 창을 닫아도 세션이 살아있다.

```
[터미널 창] ──붙었다 떨어졌다── [tmux 서버 (백그라운드)]
                                      ├─ 세션 dev
                                      ├─ 세션 logs
                                      └─ 세션 yeon
```

- **재부팅하면 죽음.** 세션 영속성은 로그아웃/SSH 끊김까지만 보장.

---

## 개념 3단계

| 단위 | 설명 | 비유 |
|------|------|------|
| 세션 (session) | 가장 큰 단위. `tmux ls`에 나오는 것 | 브라우저 창 |
| 윈도우 (window) | 세션 안의 탭 | 브라우저 탭 |
| 패널 (pane) | 윈도우 안에서 분할된 화면 | 탭 안의 분할 뷰 |

상태바 예시: `[3] 0:zsh* 1:zsh 2:zsh-`
- `[3]` = 세션 이름 `3`
- `0:zsh*` = 0번 윈도우, 이름 `zsh`, 별표는 현재 활성
- `2:zsh-` = 하이픈은 바로 직전 윈도우

---

## 프리픽스 키

tmux의 모든 단축키는 **`Ctrl+b` 누르고 손 뗀 뒤 다음 키** 를 누르는 방식이다. 이 문서에서 `Ctrl+b → x` 표기가 그 뜻.

---

## 세션 관리 (터미널에서 실행)

| 목적 | 명령 |
|------|------|
| 새 세션 시작 | `tmux new -s 이름` |
| 세션 목록 | `tmux ls` |
| 세션 접속 | `tmux attach -t 이름` (또는 `tmux a -t 이름`) |
| 세션 죽이기 | `tmux kill-session -t 이름` |
| 전부 죽이기 | `tmux kill-server` |

### 이름은 꼭 붙이자
`tmux new`만 치면 0, 1, 2 자동번호가 쌓여서 용도를 구분 못 한다.
```bash
tmux new -s dev
tmux new -s logs
tmux new -s yeon
```

---

## 세션 안에서 쓰는 키

### 세션 조작
| 동작 | 키 |
|------|-----|
| 세션 떠나기 (안 죽음) | `Ctrl+b → d` |
| 세션 목록 띄우고 전환 | `Ctrl+b → s` |
| 이전 세션 | `Ctrl+b → (` |
| 다음 세션 | `Ctrl+b → )` |

### 윈도우 (탭)
| 동작 | 키 |
|------|-----|
| 새 윈도우 | `Ctrl+b → c` |
| 다음 윈도우 | `Ctrl+b → n` |
| 이전 윈도우 | `Ctrl+b → p` |
| 번호로 이동 | `Ctrl+b → 0~9` |
| 윈도우 이름 변경 | `Ctrl+b → ,` |
| 윈도우 닫기 | `exit` 또는 `Ctrl+d` |

### 패널 (분할)
| 동작 | 키 |
|------|-----|
| 좌우 분할 | `Ctrl+b → %` |
| 상하 분할 | `Ctrl+b → "` |
| 패널 이동 | `Ctrl+b → 방향키` |
| 패널 크기 조절 | `Ctrl+b → Ctrl+방향키` |
| 패널 전체화면 토글 | `Ctrl+b → z` |
| 패널 닫기 | `exit` 또는 `Ctrl+d` |

### 도움말
| 동작 | 키 |
|------|-----|
| 전체 단축키 보기 | `Ctrl+b → ?` (q로 나감) |

---

## 자주 겪는 문제

### "sessions should be nested with care"
**원인:** tmux 안에서 또 `tmux attach`를 시도했을 때 나옴.
**해결:**
1. `Ctrl+b → d` 로 먼저 현재 세션에서 빠져나온 뒤 attach, **또는**
2. 세션 안에서 바로 전환하려면 `Ctrl+b → s`

강제로 중첩(`unset TMUX`)은 프리픽스가 꼬이니 비추천.

### 세션이 0, 1, 2로 쌓여서 헷갈림
이름 없이 `tmux new`를 여러 번 쳐서 그럼. 정리:
```bash
tmux kill-session -t 0
tmux kill-session -t 1
```
앞으로는 항상 `-s 이름` 붙이기.

### 이미 attached인 세션에 또 붙으면
화면이 공유된다 (둘 다 똑같이 보임). 혼자 쓰려면:
```bash
tmux attach -d -t 이름   # -d = 기존 접속 끊어냄
```

---

## 실전 시나리오

### 시나리오 1 — 개발 서버 띄워놓고 다른 거 하기
```bash
tmux new -s dev
pnpm dev
# Ctrl+b → d 로 떠남. 터미널 닫아도 서버 유지.
# 나중에
tmux a -t dev
```

### 시나리오 2 — 한 화면에서 코드 + 로그 + shell
```bash
tmux new -s work
# Ctrl+b → "  (상하 분할)
# 위 패널: 코드 편집
# 아래 패널: tail -f logs/app.log
# Ctrl+b → %  (아래 패널을 다시 좌우 분할)
# → 3분할 완성
```

### 시나리오 3 — SSH 서버에서 긴 작업
```bash
ssh myserver
tmux new -s train
python train.py   # 3시간짜리
# Ctrl+b → d
exit              # SSH 끊고 노트북 닫음
# 나중에
ssh myserver
tmux a -t train   # 진행 상황 그대로
```

---

## 선택: 마우스 활성화

`~/.tmux.conf` 만들어서:
```
set -g mouse on
```
그 다음 tmux 재시작(`tmux kill-server` 후 다시 new)하거나, 세션 안에서 `Ctrl+b → :` 누르고 `source-file ~/.tmux.conf`.

이러면 마우스로 패널 클릭, 크기 조절, 스크롤 가능.

---

## 최소 암기표

진짜 이것만 외워도 일단 쓸 수 있다.

| 상황 | 명령/키 |
|------|---------|
| 시작 | `tmux new -s 이름` |
| 나오기 (안 죽임) | `Ctrl+b → d` |
| 목록 | `tmux ls` |
| 다시 들어가기 | `tmux a -t 이름` |
| 세션 전환 | `Ctrl+b → s` |
| 좌우 분할 | `Ctrl+b → %` |
| 상하 분할 | `Ctrl+b → "` |
| 패널 이동 | `Ctrl+b → 방향키` |
| 새 탭 | `Ctrl+b → c` |
| 탭 번호 이동 | `Ctrl+b → 숫자` |
