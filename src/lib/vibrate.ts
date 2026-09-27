// A short vibration as a confirmation felt in the hand (bright sun, noisy kiosk). Android only: an
// iPhone ignores it for web pages. Never fails.
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // no vibration on this device
  }
}
