import { describe, expect, it } from "vitest";

import { isAcceptedAudioFile } from "../audio-file";

describe("isAcceptedAudioFile", () => {
  it("audio mime type은 허용한다", () => {
    expect(
      isAcceptedAudioFile({
        name: "recording.mp3",
        type: "audio/mpeg",
      }),
    ).toBe(true);
  });

  it("mime type이 비어도 오디오 확장자면 허용한다", () => {
    expect(
      isAcceptedAudioFile({
        name: "voice.m4a",
        type: "",
      }),
    ).toBe(true);
  });

  it("비오디오 파일은 차단한다", () => {
    expect(
      isAcceptedAudioFile({
        name: "document.pdf",
        type: "application/pdf",
      }),
    ).toBe(false);
  });
});
