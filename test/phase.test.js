import assert from "node:assert/strict";
import test from "node:test";
import { selectUpdates } from "../src/index.js";
import { assertPartition, entity, tier } from "./helpers.js";
import { expectDue, fnv1a32 } from "./oracle.js";

test("the documented FNV-1a vectors and phases are stable", () => {
  assert.equal(fnv1a32(""), 2166136261);
  assert.equal(fnv1a32("a"), 3826002220);
  assert.equal(fnv1a32("entity-a") % 4, 0);
  assert.equal(fnv1a32("entity-b") % 4, 1);
  assert.equal(fnv1a32("entity-c") % 4, 2);
  assert.equal(fnv1a32("entity-d") % 4, 3);
  assert.equal(fnv1a32("entity-a") % 2, 0);
  assert.equal(fnv1a32("entity-b") % 2, 1);
});

test("one interval-4 tier spreads entity-a through entity-d across four ticks", () => {
  const entities = [
    entity("entity-a", 6, 8),
    entity("entity-b", 0, 20),
    entity("entity-c", 0, 30),
    entity("entity-d", 0, 40)
  ];
  const spread = selectUpdates({
    observer: { x: 0, y: 0 },
    entities,
    tiers: [tier(100, 4)],
    tick: 0
  });
  assert.deepEqual(spread.due, ["entity-a"]);
  assert.deepEqual(spread.waiting, ["entity-b", "entity-c", "entity-d"]);
  assert.deepEqual(spread.deferred, []);
  assert.deepEqual(spread.culled, []);
  const second = selectUpdates({
    observer: { x: 0, y: 0 },
    entities,
    tiers: [tier(100, 4)],
    tick: 1
  });
  assert.deepEqual(second.due, ["entity-d"]);
  assert.deepEqual(second.waiting, ["entity-a", "entity-b", "entity-c"]);
  const third = selectUpdates({
    observer: { x: 0, y: 0 },
    entities,
    tiers: [tier(100, 4)],
    tick: 2
  });
  assert.deepEqual(third.due, ["entity-c"]);
  assert.deepEqual(third.waiting, ["entity-a", "entity-b", "entity-d"]);
  const fourth = selectUpdates({
    observer: { x: 0, y: 0 },
    entities,
    tiers: [tier(100, 4)],
    tick: 3
  });
  assert.deepEqual(fourth.due, ["entity-b"]);
  assert.deepEqual(fourth.waiting, ["entity-a", "entity-c", "entity-d"]);
  const wrapped = selectUpdates({
    observer: { x: 0, y: 0 },
    entities,
    tiers: [tier(100, 4)],
    tick: 4
  });
  assert.deepEqual(wrapped.due, spread.due);
  assert.deepEqual(wrapped.waiting, spread.waiting);
  for (const result of [spread, second, third, fourth]) {
    assertPartition(entities, result);
    assert.equal(result.due.length, 1);
  }
});

test("each entity is due once per interval and the phase ignores position", () => {
  const ids = ["entity-a", "entity-b", "entity-c", "entity-d"];
  for (const id of ids) {
    let hits = 0;
    const ticks = [];
    for (let tick = 0; tick < 4; tick += 1) {
      const result = selectUpdates({
        observer: { x: 0, y: 0 },
        entities: [entity(id, 1, 0)],
        tiers: [tier(10, 4)],
        tick
      });
      if (result.due.length === 1) {
        hits += 1;
        ticks.push(tick);
      } else {
        assert.deepEqual(result.waiting, [id]);
      }
    }
    assert.equal(hits, 1);
    const moved = selectUpdates({
      observer: { x: 4, y: -2 },
      entities: [entity(id, 4, 1)],
      tiers: [tier(10, 4)],
      tick: ticks[0]
    });
    assert.deepEqual(moved.due, [id]);
    const shifted = selectUpdates({
      observer: { x: 0, y: 0 },
      entities: [entity(id, 1, 0)],
      tiers: [tier(10, 4)],
      tick: ticks[0] + 4
    });
    assert.deepEqual(shifted.due, [id]);
    const idle = selectUpdates({
      observer: { x: 0, y: 0 },
      entities: [entity(id, 1, 0)],
      tiers: [tier(10, 4)],
      tick: ticks[0] + 1
    });
    assert.deepEqual(idle.waiting, [id]);
  }
});

test("forty ids in one tier of interval 4 are spread across the four ticks", () => {
  const entities = [];
  for (let index = 0; index < 40; index += 1) {
    entities.push(entity("entity-" + index, index, 0));
  }
  const counts = [];
  const seen = Object.create(null);
  let first = null;
  for (let tick = 0; tick < 4; tick += 1) {
    const result = selectUpdates({
      observer: { x: 0, y: 0 },
      entities,
      tiers: [tier(100, 4)],
      tick
    });
    counts.push(result.due.length);
    assert.equal(result.deferred.length, 0);
    assert.equal(result.culled.length, 0);
    assert.equal(result.due.length + result.waiting.length, 40);
    assertPartition(entities, result);
    for (const id of result.due) {
      assert.equal(Object.hasOwn(seen, id), false);
      seen[id] = tick;
    }
    if (tick === 0) {
      first = result.due;
    }
  }
  assert.deepEqual(counts, [11, 11, 9, 9]);
  assert.equal(Object.keys(seen).length, 40);
  const repeated = selectUpdates({
    observer: { x: 0, y: 0 },
    entities,
    tiers: [tier(100, 4)],
    tick: 4
  });
  assert.deepEqual(repeated.due, first);
  const halves = [0, 0];
  for (let tick = 0; tick < 2; tick += 1) {
    const result = selectUpdates({
      observer: { x: 0, y: 0 },
      entities,
      tiers: [tier(100, 2)],
      tick
    });
    halves[tick] = result.due.length;
    assert.equal(result.due.length + result.waiting.length, 40);
  }
  assert.deepEqual(halves, [20, 20]);
});

test("the schedule matches exact integer arithmetic for large ticks", () => {
  const ids = ["entity-a", "entity-b", "entity-c", "entity-d", " ", "__proto__", "entity-\u00e9"];
  const intervals = [1, 2, 4, 5, Number.MAX_SAFE_INTEGER];
  const ticks = [0, 1, 2, 3, 5, 6, Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER];
  for (const id of ids) {
    for (const interval of intervals) {
      for (const tick of ticks) {
        const result = selectUpdates({
          observer: { x: 0, y: 0 },
          entities: [entity(id, 1, 0)],
          tiers: [tier(10, interval)],
          tick
        });
        const due = expectDue(tick, id, interval);
        assert.equal(result.due.length, due ? 1 : 0);
        assert.equal(result.waiting.length, due ? 0 : 1);
        assert.deepEqual(result.deferred, []);
        assert.deepEqual(result.culled, []);
      }
    }
  }
});

test("changing tiers changes the modulus and culling removes the entity", () => {
  const near = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-b", 1, 0)],
    tiers: [tier(10, 2)],
    tick: 0
  });
  assert.deepEqual(near.waiting, ["entity-b"]);
  const far = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-b", 1, 0)],
    tiers: [tier(10, 4)],
    tick: 3
  });
  assert.deepEqual(far.due, ["entity-b"]);
  const culled = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-b", 30, 0)],
    tiers: [tier(10, 1)],
    tick: 0
  });
  assert.deepEqual(culled.culled, ["entity-b"]);
  assert.deepEqual(culled.due, []);
});
