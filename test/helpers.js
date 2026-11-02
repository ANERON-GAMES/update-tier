import assert from "node:assert/strict";

export function entity(id, x, y, z) {
  if (z === undefined) {
    return { id, position: { x, y } };
  }
  return { id, position: { x, y, z } };
}

export function tier(distance, interval) {
  return { distance, interval };
}

export function valid(extra = {}) {
  return {
    observer: { x: 0, y: 0 },
    entities: [entity("entity-a", 1, 0)],
    tiers: [tier(10, 1)],
    tick: 0,
    ...extra
  };
}

export function tierRow(distance, interval, count, due, deferred, waiting) {
  return { distance, interval, count, due, deferred, waiting };
}

export function assertFrozen(result) {
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.due), true);
  assert.equal(Object.isFrozen(result.deferred), true);
  assert.equal(Object.isFrozen(result.waiting), true);
  assert.equal(Object.isFrozen(result.culled), true);
  assert.equal(Object.isFrozen(result.tiers), true);
  for (const entry of result.tiers) {
    assert.equal(Object.isFrozen(entry), true);
  }
}

export function assertPartition(entities, result) {
  const expected = [];
  for (const entry of entities) {
    expected.push(entry.id);
  }
  expected.sort(compareString);
  const actual = [];
  for (const id of result.due) {
    actual.push(id);
  }
  for (const id of result.deferred) {
    actual.push(id);
  }
  for (const id of result.waiting) {
    actual.push(id);
  }
  for (const id of result.culled) {
    actual.push(id);
  }
  const seen = Object.create(null);
  for (const id of actual) {
    assert.equal(Object.hasOwn(seen, id), false);
    seen[id] = true;
  }
  const sorted = actual.slice();
  sorted.sort(compareString);
  assert.deepEqual(sorted, expected);
  let counted = 0;
  let due = 0;
  let deferred = 0;
  let waiting = 0;
  for (const entry of result.tiers) {
    assert.equal(entry.count, entry.due + entry.deferred + entry.waiting);
    counted += entry.count;
    due += entry.due;
    deferred += entry.deferred;
    waiting += entry.waiting;
  }
  assert.equal(counted + result.culled.length, entities.length);
  assert.equal(due, result.due.length);
  assert.equal(deferred, result.deferred.length);
  assert.equal(waiting, result.waiting.length);
}

function compareString(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
