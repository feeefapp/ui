/**
 * Estimates the speed of a pointer-driven value from recent samples, the way a pan gesture reports
 * velocity on release. A least-squares fit over the last `window` ms smooths jitter; a pointer
 * that stopped before lifting reports 0, so a careful drop never flings.
 */
export class LabVelocityTracker {
  private samples: { time: number; value: number }[] = []
  constructor(
    /** How much recent history to fit, in milliseconds. */
    private readonly window = 100,
    /** A gap this long (ms) between the last sample and release means the pointer had stopped. */
    private readonly stopAfter = 60,
    /** Ignore absurd speeds from timer jitter (units per second). */
    private readonly maxSpeed = 8000
  ) {}

  /** Records the value at `time` (ms, e.g. `event.timeStamp`). */
  add(value: number, time: number) {
    const last = this.samples[this.samples.length - 1]
    if (last && time <= last.time) {
      last.value = value
      return
    }
    this.samples.push({ time, value })
    const cutoff = time - this.window
    while (this.samples.length > 2 && this.samples[0].time < cutoff) this.samples.shift()
  }

  /** Units per second at `now` (ms); 0 with too little data or after a pause. */
  velocity(now?: number) {
    const samples = this.samples
    if (samples.length < 2) return 0
    const last = samples[samples.length - 1]
    if (now !== undefined && now - last.time > this.stopAfter) return 0
    const recent = samples.filter((s) => s.time >= last.time - this.window)
    if (recent.length < 2) return 0
    let meanT = 0,
      meanV = 0
    for (const s of recent) {
      meanT += s.time
      meanV += s.value
    }
    meanT /= recent.length
    meanV /= recent.length
    let num = 0,
      den = 0
    for (const s of recent) {
      num += (s.time - meanT) * (s.value - meanV)
      den += (s.time - meanT) ** 2
    }
    if (!den) return 0
    const perSecond = (num / den) * 1000
    return Math.max(-this.maxSpeed, Math.min(this.maxSpeed, perSecond))
  }

  reset() {
    this.samples = []
  }
}
