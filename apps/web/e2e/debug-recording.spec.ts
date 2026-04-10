import { test } from "@playwright/test";
import path from "path";

test("녹음 시작 → 종료 후 UI 상태 스크린샷", async ({ page }) => {
  // MediaDevices / MediaRecorder mock
  await page.addInitScript(() => {
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
          const blob = new Blob(["fake-audio"], { type: "audio/webm" });
          const event = { data: blob } as BlobEvent;
          this.ondataavailable(event);
        }
      }

      stop() {
        this.state = "inactive";
        // onstop을 동기적으로 즉시 호출
        if (this.onstop) {
          this.onstop();
        }
      }

      pause() { this.state = "paused"; }
      resume() { this.state = "recording"; }
      requestData() {}
    }

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

  // API route mocks
  await page.route("/api/v1/counseling-records", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ records: [] }),
      });
    } else if (route.request().method() === "POST") {
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

  await page.route("/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: "test-user", name: "테스트" } }),
    }),
  );

  // Step 1: /home 접속 직후
  await page.goto("/home");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/tmp/debug-01-home-loaded.png", fullPage: true });

  // Step 2: "바로 녹음하기" 버튼 클릭 직후
  const startBtn = page.getByRole("button", { name: /바로 녹음하기/ });
  await startBtn.waitFor({ state: "visible", timeout: 5000 });
  await startBtn.click();
  await page.screenshot({ path: "/tmp/debug-02-after-start-click.png", fullPage: true });

  // Step 3: 1초 대기 후
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/debug-03-after-1s.png", fullPage: true });

  // Step 4: "녹음 종료" 버튼 클릭 직후 (500ms 이내)
  const stopBtn = page.getByRole("button", { name: /녹음 종료/ });
  await stopBtn.waitFor({ state: "visible", timeout: 5000 });
  await stopBtn.click();
  // 500ms 이내 스크린샷
  await page.waitForTimeout(200);
  await page.screenshot({ path: "/tmp/debug-04-after-stop-200ms.png", fullPage: true });

  // Step 5: 클릭 후 2초 뒤
  await page.waitForTimeout(1800); // 200ms + 1800ms = 2s total
  await page.screenshot({ path: "/tmp/debug-05-after-2s.png", fullPage: true });

  // Step 6: 클릭 후 5초 뒤
  await page.waitForTimeout(3000); // 2s + 3s = 5s total
  await page.screenshot({ path: "/tmp/debug-06-after-5s.png", fullPage: true });
});
