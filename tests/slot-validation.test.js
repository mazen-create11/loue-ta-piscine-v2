import test from 'node:test';
import assert from 'node:assert/strict';
import { slotsOverlap, validateSlotInput } from '../src/slot-validation.js';

const valid = {
  format:'open',
  startAt:'2026-08-01T09:00:00.000Z',
  endAt:'2026-08-01T11:00:00.000Z',
  priceAmount:7,
  priceUnit:'person',
  capacity:12
};

test('normalise un créneau valide', () => {
  assert.deepEqual(validateSlotInput(valid), valid);
});

test('refuse une plage inversée', () => {
  assert.throws(() => validateSlotInput({...valid,endAt:valid.startAt}), /après/);
});

test('refuse un format, un tarif ou une capacité invalides', () => {
  assert.throws(() => validateSlotInput({...valid,format:'fake'}), /format/);
  assert.throws(() => validateSlotInput({...valid,priceAmount:5001}), /tarif/);
  assert.throws(() => validateSlotInput({...valid,capacity:0}), /capacité/);
});

test('détecte un chevauchement mais autorise deux créneaux contigus', () => {
  const existing = [{...valid,status:'open',start_at:valid.startAt,end_at:valid.endAt}];
  assert.equal(slotsOverlap({...valid,startAt:'2026-08-01T10:00:00.000Z'}, existing), true);
  assert.equal(slotsOverlap({...valid,startAt:valid.endAt,endAt:'2026-08-01T13:00:00.000Z'}, existing), false);
});
