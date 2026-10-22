/** Index of the first option whose width fits `available`, or the last option when none does. */
export function pickFitting(widths: readonly number[], available: number) {
  const i = widths.findIndex((w) => w <= available + 0.5)
  return i < 0 ? widths.length - 1 : i
}
