import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stepSearchMorph, searchMorphVisibility } from '../src/toolbar-search-motion'
test('search material settles and reverses with retained physical momentum', () => {
  let state = {position:46,velocity:0}
  for(let i=0;i<12;i++) state=stepSearchMorph(state,500,1/60)
  assert.ok(state.velocity>0)
  const reversed=stepSearchMorph(state,46,1/10000)
  assert.ok(reversed.velocity>0, 'retargeting must not reset momentum')
  state=reversed
  for(let i=0;i<240;i++) state=stepSearchMorph(state,46,1/60)
  assert.ok(Math.abs(state.position-46)<.01)
  assert.ok(Math.abs(state.velocity)<.01)
})
test('editor and returning controls never share their visible interval', () => {
  for(let i=0;i<=100;i++) {const v=searchMorphVisibility(i/100); assert.ok(v.editor===0 || v.controls===0)}
  assert.deepEqual(searchMorphVisibility(0),{editor:0,controls:1})
  assert.deepEqual(searchMorphVisibility(1),{editor:1,controls:0})
})
