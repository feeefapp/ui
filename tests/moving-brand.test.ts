import test from 'node:test'
import assert from 'node:assert/strict'
import { movingBrandLayer } from '../src/workspace/moving-brand-model'

test('moving brand escapes transformed panel chrome but stays inside modal top layers', () => {
  const body = { name: 'body' }
  const modal = { name: 'drawer' }
  const queries: string[] = []
  const anchor = { closest: (selector: string) => { queries.push(selector); return selector === 'dialog:modal' ? modal : null } }
  assert.equal(movingBrandLayer(anchor, body), modal)
  assert.deepEqual(queries, ['dialog:modal'])
  assert.equal(movingBrandLayer({ closest: () => null }, body), body)
  assert.equal(movingBrandLayer(null, body), body)
})
