import { describe, expect, it } from "vitest";

import { COUNSELING_AUDIO_TEST_DATA } from "./counseling-audio-test-data";

describe("COUNSELING_AUDIO_TEST_DATA", () => {
  it("모든 테스트 음성 다운로드 항목에 href와 파일명이 있다", () => {
    expect(COUNSELING_AUDIO_TEST_DATA).toHaveLength(3);

    for (const sample of COUNSELING_AUDIO_TEST_DATA) {
      expect(sample.href.startsWith("/test-data/")).toBe(true);
      expect(sample.fileName.endsWith(".mp3")).toBe(true);
      expect(sample.shortLabel.length).toBeGreaterThan(0);
    }
  });
});
