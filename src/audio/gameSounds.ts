let ctxCache: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!ctxCache) ctxCache = new AudioContextCtor()
  void ctxCache.resume().catch(() => {})
  return ctxCache
}

function buzz(ctx: AudioContext, freq: number, durationMs: number, type: OscillatorType, gainMax = 0.12): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(gainMax, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + durationMs / 1000 + 0.02)
}

export function playDealTick(): void {
  const ctx = audioCtx()
  if (!ctx) return
  buzz(ctx, 420, 80, 'sine', 0.045)
}

export function playError(): void {
  const ctx = audioCtx()
  if (!ctx) return
  buzz(ctx, 160, 120, 'sawtooth', 0.08)
  window.setTimeout(() => buzz(ctx, 120, 140, 'square', 0.055), 60)
}

export function playPlaceSuccess(): void {
  const ctx = audioCtx()
  if (!ctx) return
  buzz(ctx, 660, 90, 'sine', 0.1)
  window.setTimeout(() => buzz(ctx, 880, 110, 'triangle', 0.08), 65)
}

export function playWinFanfare(): void {
  const ctx = audioCtx()
  if (!ctx) return
  const seq = [
    [523.25, 90],
    [659.25, 90],
    [783.99, 110],
    [1046.5, 180],
    [1318.51, 220],
  ] as const
  let delay = 0
  for (const [fq, dur] of seq) {
    window.setTimeout(() => buzz(ctx, fq, dur, 'sine', 0.11), delay)
    delay += dur - 35
  }
  window.setTimeout(() => buzz(ctx, 1567.98, 320, 'triangle', 0.065), delay + 120)
}

export function playCategoryComplete(): void {
  const ctx = audioCtx()
  if (!ctx) return
  buzz(ctx, 520, 100, 'sine', 0.1)
  window.setTimeout(() => buzz(ctx, 784, 130, 'triangle', 0.095), 90)
  window.setTimeout(() => buzz(ctx, 1046.5, 280, 'sine', 0.08), 210)
}
