export function vibrateError(): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate([40, 30, 50])
  } catch {
    /* ignore */
  }
}
