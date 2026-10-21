import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moveSpeechBlock, speechPreviewOffsets, speechDragIndex } from '../src/speech/block-order'
test('reordering keeps each block and its voice/delivery data together', () => {
 const a={text:'First',voice:'Kore'}, b={text:'Second',voice:'Puck'}
 const original=[a,b]; assert.deepEqual(moveSpeechBlock(original,0,1),[b,a]); assert.equal(original[0],a)
 assert.equal(moveSpeechBlock(original,-1,1),original)
})
test('mixed-height drag preview reserves measured slots and reaches the final card', () => {
 const slots=[{top:0,height:200},{top:212,height:40},{top:264,height:60}]
 assert.equal(speechDragIndex(slots,0,210),2)
 assert.deepEqual(speechPreviewOffsets(slots,0,2),[124,-212,-212])
})
