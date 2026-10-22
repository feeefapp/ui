import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  LAB_SPRINGS,
  nearestTarget,
  projectMomentum,
  rubberBand,
  rubberBandClamp,
  solveSpring,
  springAtRest,
  springCoefficients,
} from '../src/physics/spring.ts'
import { LabVelocityTracker } from '../src/physics/velocity.ts'

const near = (a: number, b: number, epsilon = 1e-6) => Math.abs(a - b) <= epsilon

test('spring coefficients follow SwiftUI duration/bounce mapping', () => {
  const { stiffness, damping } = springCoefficients({ duration: 0.5, bounce: 0 })
  assert.ok(near(stiffness, 157.91367, 1e-4))
  assert.ok(near(damping, 25.13274, 1e-4))
})

test('a smooth spring never overshoots and settles near its duration', () => {
  const at = solveSpring(LAB_SPRINGS.smooth, 0, 100)
  let max = -Infinity
  for (let t = 0; t <= 2; t += 1 / 120) max = Math.max(max, at(t).position)
  assert.ok(max <= 100 + 1e-9)
  assert.ok(Math.abs(at(LAB_SPRINGS.smooth.duration * 1.5).position - 100) < 1)
  assert.ok(springAtRest(at(2), 100, 0.01))
})

test('a bouncy spring overshoots, then settles', () => {
  const at = solveSpring(LAB_SPRINGS.bouncy, 0, 1)
  let overshoot = 0
  for (let t = 0; t <= 2; t += 1 / 240) overshoot = Math.max(overshoot, at(t).position - 1)
  assert.ok(overshoot > 0.03 && overshoot < 0.1, `overshoot ${overshoot}`) // bounce 0.3 = damping ratio 0.7 ≈ 4.6%
  assert.ok(springAtRest(at(3), 1, 1e-4))
})

test('initial velocity is honored exactly at t=0 (no speed change when interrupting)', () => {
  for (const spring of [LAB_SPRINGS.smooth, LAB_SPRINGS.bouncy, { duration: 0.5, bounce: -0.5 }]) {
    const at = solveSpring(spring, 20, 80, 640)
    assert.ok(near(at(0).position, 20))
    assert.ok(near(at(0).velocity, 640, 1e-6))
  }
})

test('velocity is the derivative of position for all damping regimes', () => {
  for (const spring of [LAB_SPRINGS.bouncy, LAB_SPRINGS.smooth, { duration: 0.4, bounce: -0.6 }]) {
    const at = solveSpring(spring, 0, 1, -3)
    for (const t of [0.05, 0.2, 0.6]) {
      const h = 1e-5
      const numeric = (at(t + h).position - at(t - h).position) / (2 * h)
      assert.ok(near(numeric, at(t).velocity, 1e-3), `${JSON.stringify(spring)} t=${t}`)
    }
  }
})

test('retargeting mid-flight continues from the same position and speed', () => {
  const first = solveSpring(LAB_SPRINGS.smooth, 0, 300)
  const mid = first(0.12)
  const second = solveSpring(LAB_SPRINGS.smooth, mid.position, -50, mid.velocity)
  assert.ok(near(second(0).position, mid.position))
  assert.ok(near(second(0).velocity, mid.velocity, 1e-6))
  assert.ok(second(0.016).position > mid.position, 'momentum carries it forward before turning')
})

test('momentum projection: faster flicks travel further; fast deceleration travels less', () => {
  assert.equal(projectMomentum(100, 0), 100)
  assert.ok(near(projectMomentum(0, 1000), 499))
  assert.ok(near(projectMomentum(0, 1000, 0.99), 99))
  assert.ok(projectMomentum(0, -2000) < projectMomentum(0, -1000))
})

test('rubber band resists, is odd, and never exceeds the dimension', () => {
  assert.equal(rubberBand(0, 400), 0)
  const a = rubberBand(50, 400),
    b = rubberBand(100, 400)
  assert.ok(a > 0 && a < 50 && b > a && b - a < a)
  assert.ok(near(rubberBand(-50, 400), -a))
  assert.ok(rubberBand(1e9, 400) < 400)
  assert.equal(rubberBandClamp(50, 0, 100, 400), 50)
  assert.ok(rubberBandClamp(150, 0, 100, 400) > 100 && rubberBandClamp(150, 0, 100, 400) < 150)
  assert.ok(rubberBandClamp(-30, 0, 100, 400) < 0 && rubberBandClamp(-30, 0, 100, 400) > -30)
})

test('nearest target picks the closest snap point', () => {
  assert.equal(nearestTarget(130, [0, 200, 600]), 200)
  assert.equal(nearestTarget(-80, [0, 200, 600]), 0)
  assert.equal(nearestTarget(5000, [0, 200, 600]), 600)
})

test('velocity tracker measures steady motion and ignores a pause before release', () => {
  const tracker = new LabVelocityTracker()
  for (let i = 0; i <= 10; i++) tracker.add(i * 8, 1000 + i * 8) // 8px every 8ms = 1000 px/s
  assert.ok(near(tracker.velocity(1080), 1000, 1))
  assert.equal(tracker.velocity(1080 + 200), 0, 'a held pointer does not fling')
  tracker.reset()
  assert.equal(tracker.velocity(), 0)
  tracker.add(0, 0)
  tracker.add(1000, 1)
  assert.equal(tracker.velocity(1), 8000, 'clamped to max speed')
})
