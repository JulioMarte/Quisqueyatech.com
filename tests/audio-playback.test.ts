import assert from "node:assert/strict";
import test from "node:test";
import {
  attemptAudioPlayback,
  playbackFailureStatus,
  prepareAudioElement,
} from "../lib/livekit/audio-playback";

function mediaElement(play: () => Promise<void>) {
  const attributes = new Map<string, string>();
  return {
    autoplay: false,
    muted: false,
    play,
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    attributes,
  };
}

test("prepares late audio tracks for inline autoplay and preserves speaker mute", () => {
  const element = mediaElement(async () => undefined);
  prepareAudioElement(element as unknown as HTMLMediaElement, true);
  assert.equal(element.autoplay, true);
  assert.equal(element.muted, true);
  assert.equal(element.attributes.get("playsinline"), "true");
});

test("classifies successful playback and browser autoplay rejection", async () => {
  assert.equal(await attemptAudioPlayback(mediaElement(async () => undefined)), "playing");
  assert.equal(
    await attemptAudioPlayback(
      mediaElement(async () => {
        throw new DOMException("Not allowed", "NotAllowedError");
      }),
    ),
    "blocked",
  );
});

test("distinguishes a browser audio lock from a failed output path", () => {
  assert.equal(playbackFailureStatus(false), "audio-unlock-required");
  assert.equal(playbackFailureStatus(true), "audio-failed");
});
