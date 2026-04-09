import { test, expect } from "@playwright/test";

/**
 * 녹음 중단 버튼 동작 검증
 *
 * 버그: stop() 클릭 후 업로드가 완료될 때까지 phase가 "recording"으로 멈춰
 *       버튼이 반응하지 않는 것처럼 보이는 현상
 *
 * 수정: stop() 호출 즉시 임시 레코드로 processing 상태 전환,
 *       업로드는 백그라운드에서 진행 후 실제 레코드로 교체
 */

test.describe("녹음 중단 버튼", () => {
  test.beforeEach(async ({ page }) => {
    // 1. MediaDevices.getUserMedia를 가짜 스트림으로 대체
    await page.addInitScript(() => {
      // AudioContext 없이도 동작하는 더미 MediaStream 생성
      const fakeTrack = {
        kind: "audio",
        id: "fake-audio-track",
        label: "Fake Audio",
        enabled: true,
        muted: false,
        readyState: "live",
        stop: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        clone: function () { return this; },
        getCapabilities: () => ({}),
        getConstraints: () => ({}),
        getSettings: () => ({}),
        applyConstraints: () => Promise.resolve(),
        onended: null,
        onmute: null,
        onunmute: null,
      } as unknown as MediaStreamTrack;

      const fakeStream = {
        getTracks: () => [fakeTrack],
        getAudioTracks: () => [fakeTrack],
        getVideoTracks: () => [],
        active: true,
        id: "fake-stream",
        addTrack: () => {},
        removeTrack: () => {},
        clone: function () { return this; },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        onaddtrack: null,
        onremovetrack: null,
        getTrackById: () => null,
      } as unknown as MediaStream;

      // MediaRecorder를 간단한 가짜로 대체
      class FakeMediaRecorder extends EventTarget {
        state: RecordingState = "inactive";
        stream: MediaStream;
        ondataavailable: ((e: BlobEvent) => void) | null = null;
        onstop: (() => void) | null = null;
        onerror: ((e: Event) => void) | null = null;
        onstart: (() => void) | null = null;
        onpause: (() => void) | null = null;
        onresume: (() => void) | null = null;
        mimeType = "audio/webm";
        audioBitsPerSecond = 128000;
        videoBitsPerSecond = 0;
        static isTypeSupported() { return true; }

        constructor(stream: MediaStream) {
          super();
          this.stream = stream;
        }

        start() {
          this.state = "recording";
          if (this.ondataavailable) {
            // 더미 데이터 이벤트 발생
            const blob = new Blob(["fake-audio"], { type: "audio/webm" });
            const event = { data: blob } as BlobEvent;
            this.ondataavailable(event);
          }
        }

        stop() {
          this.state = "inactive";
          if (this.onstop) {
            this.onstop();
          }
        }

        pause() { this.state = "paused"; }
        resume() { this.state = "recording"; }
        requestData() {}
      }

      // 전역 재정의
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.resolve(fakeStream),
          enumerateDevices: () => Promise.resolve([]),
          getSupportedConstraints: () => ({}),
        },
        writable: true,
        configurable: true,
      });

      (window as unknown as Record<string, unknown>).MediaRecorder = FakeMediaRecorder;
    });

    // 2. API fetch를 인터셉트 — 인증 없이도 동작하도록
    await page.route("/api/v1/counseling-records", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ records: [] }),
        });
      } else if (route.request().method() === "POST") {
        // 업로드 응답 — 실제 서버 레코드 모양
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            record: {
              id: "real-record-id-001",
              studentName: "",
              sessionTitle: "녹음 테스트",
              counselingType: "",
              counselorName: null,
              status: "processing",
              preview: "",
              tags: [],
              audioOriginalName: "test.webm",
              audioMimeType: "audio/webm",
              audioByteSize: 100,
              audioDurationMs: 3000,
              transcriptSegmentCount: 0,
              transcriptTextLength: 0,
              language: null,
              sttModel: null,
              errorMessage: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              transcriptionCompletedAt: null,
              transcriptText: "",
              transcriptSegments: [],
              audioUrl: "",
            },
          }),
        });
      }
    });

    // 3. 세션 체크 라우트도 처리
    await page.route("/api/v1/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { id: "test-user", name: "테스트" } }),
      }),
    );
  });

  test("녹음 종료 버튼 클릭 시 즉시 processing 상태로 전환된다", async ({ page }) => {
    await page.goto("/home");

    // EmptyState 또는 Sidebar가 로드될 때까지 대기
    await page.waitForLoadState("networkidle");

    // "바로 녹음하기" 버튼 클릭
    const startBtn = page.getByRole("button", { name: /바로 녹음하기/ });
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // 녹음 중 상태 확인
    await expect(page.getByText("녹음 중입니다")).toBeVisible({ timeout: 3000 });

    // 녹음 종료 버튼이 있는지 확인
    const stopBtn = page.getByRole("button", { name: /녹음 종료/ });
    await expect(stopBtn).toBeVisible({ timeout: 3000 });

    // 종료 버튼 클릭
    await stopBtn.click();

    // 즉시 processing 상태("녹음 중입니다" 사라짐)로 전환되어야 함
    // 최대 2초 이내 — 업로드 완료를 기다리지 않고 즉시 전환되는 것이 핵심
    await expect(page.getByText("녹음 중입니다")).not.toBeVisible({ timeout: 2000 });
  });

  test("녹음 종료 후 processing 패널이 표시된다", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const startBtn = page.getByRole("button", { name: /바로 녹음하기/ });
    await startBtn.click();

    await expect(page.getByText("녹음 중입니다")).toBeVisible({ timeout: 3000 });

    const stopBtn = page.getByRole("button", { name: /녹음 종료/ });
    await stopBtn.click();

    // 업로드 완료 후 실제 processing 패널이 표시되어야 함 (AI 분석 중 텍스트)
    await expect(page.getByText("AI 분석 중")).toBeVisible({ timeout: 5000 });
  });
});
