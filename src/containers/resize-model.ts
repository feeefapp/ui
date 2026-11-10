/** Physical arrow keys change a logical-start column; Home/End use its feasible bounds. */
export function dividerKeyValue(key: string, value: number, min: number, max: number, rtl: boolean): number | null {
  let next: number
  if (key === 'ArrowLeft' || key === 'ArrowRight') next = value + ((key === 'ArrowRight') !== rtl ? 24 : -24)
  else if (key === 'Home') next = min
  else if (key === 'End') next = max
  else return null
  return Math.max(min, Math.min(max, next))
}
