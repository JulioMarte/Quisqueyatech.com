export function prepareAudioElement(element: HTMLMediaElement, muted: boolean) {
  element.autoplay = true;
  element.muted = muted;
  element.setAttribute("playsinline", "true");
  return element;
}

export async function attemptAudioPlayback(element: Pick<HTMLMediaElement, "play">) {
  try {
    await element.play();
    return "playing" as const;
  } catch {
    return "blocked" as const;
  }
}

export function playbackFailureStatus(canPlaybackAudio: boolean) {
  return canPlaybackAudio ? ("audio-failed" as const) : ("audio-unlock-required" as const);
}
