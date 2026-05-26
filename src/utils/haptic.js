/** 모바일 등에서 navigator.vibrate 지원 시 짧은 햅틱 (미지원이면 무시) */
export function hapticTap(kind = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  const pattern =
    kind === 'medium' ? 18 : kind === 'heavy' ? 28 : kind === 'select' ? [6, 32, 6] : 10
  try {
    navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
