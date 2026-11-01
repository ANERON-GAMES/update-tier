import assert from "node:assert/strict";
import test from "node:test";
import { selectUpdates } from "../src/index.js";
import { assertFrozen, assertPartition, entity, tier, tierRow } from "./helpers.js";

const tiers = [tier(10, 1), tier(30, 2), tier(60, 4)];

const entities = [
  entity("entity-a", 6, 8),
  entity("entity-b", 0, 20),
  entity("entity-c", 0, 40),
  entity("entity-d", 0, 90)
];

function call(tick, extra = {}) {
  return selectUpdates({
    observer: { x: 0, y: 0 },
    entities,
    tiers,
    tick,
    ...extra
  });
}

test("tick 0 sends the near entity and waits on the slower tiers", () => {
  const plan = call(0);
  assert.deepEqual(plan, {
    tick: 0,
    max: null,
    due: ["entity-a"],
    deferred: [],
    waiting: ["entity-b", "entity-c"],
    culled: ["entity-d"],
    tiers: [tierRow(10, 1, 1, 1, 0, 0), tierRow(30, 2, 1, 0, 0, 1), tierRow(60, 4, 1, 0, 0, 1)]
  });
  assert.equal(plan.tick, 0);
  assert.equal(plan.max, null);
  assert.deepEqual(plan.due, ["entity-a"]);
  assert.deepEqual(plan.deferred, []);
  assert.deepEqual(plan.waiting, ["entity-b", "entity-c"]);
  assert.deepEqual(plan.culled, ["entity-d"]);
  assert.equal(plan.tiers[0].count, 1);
  assert.equal(plan.tiers[0].due, 1);
  assert.equal(plan.tiers[1].waiting, 1);
  assert.equal(plan.tiers[2].waiting, 1);
  assert.equal(plan.tiers[2].count, 1);
  assert.deepEqual(Object.keys(plan), [
    "tick",
    "max",
    "due",
    "deferred",
    "waiting",
    "culled",
    "tiers"
  ]);
  assert.deepEqual(Object.keys(plan.tiers[0]), [
    "distance",
    "interval",
    "count",
    "due",
    "deferred",
    "waiting"
  ]);
  assertFrozen(plan);
  assertPartition(entities, plan);
  assert.throws(() => plan.due.push("entity-z"), TypeError);
});

test("tick 1 adds the mid entity and tick 2 adds the far entity", () => {
  const next = call(1);
  assert.deepEqual(next.due, ["entity-a", "entity-b"]);
  assert.deepEqual(next.waiting, ["entity-c"]);
  assert.deepEqual(next.culled, ["entity-d"]);
  assert.deepEqual(next.deferred, []);
  assert.equal(next.tiers[1].due, 1);
  assert.equal(next.tiers[1].waiting, 0);
  const later = call(2);
  assert.deepEqual(later.due, ["entity-a", "entity-c"]);
  assert.deepEqual(later.waiting, ["entity-b"]);
  assert.deepEqual(later.culled, ["entity-d"]);
  const third = call(3);
  assert.deepEqual(third.due, ["entity-a", "entity-b"]);
  assert.deepEqual(third.waiting, ["entity-c"]);
  const repeated = call(4);
  assert.deepEqual(repeated.due, ["entity-a"]);
  assert.deepEqual(repeated.waiting, ["entity-b", "entity-c"]);
  assert.deepEqual(repeated.culled, ["entity-d"]);
  const again = call(6);
  assert.deepEqual(again.due, ["entity-a", "entity-c"]);
  assertPartition(entities, next);
  assertPartition(entities, later);
});

test("a cap keeps the nearer due entity and defers the rest", () => {
  const capped = call(1, { max: 1 });
  assert.equal(capped.max, 1);
  assert.deepEqual(capped.due, ["entity-a"]);
  assert.deepEqual(capped.deferred, ["entity-b"]);
  assert.deepEqual(capped.waiting, ["entity-c"]);
  assert.deepEqual(capped.culled, ["entity-d"]);
  assert.equal(capped.tiers[0].due, 1);
  assert.equal(capped.tiers[1].deferred, 1);
  assert.equal(capped.tiers[1].due, 0);
  assert.equal(capped.tiers[2].waiting, 1);
  assertPartition(entities, capped);
  const open = call(1, { max: 2 });
  assert.deepEqual(open.due, ["entity-a", "entity-b"]);
  assert.deepEqual(open.deferred, []);
  const zero = call(1, { max: 0 });
  assert.deepEqual(zero.due, []);
  assert.deepEqual(zero.deferred, ["entity-a", "entity-b"]);
  assert.deepEqual(zero.waiting, ["entity-c"]);
  const roomy = call(1, { max: 10 });
  assert.deepEqual(roomy.due, ["entity-a", "entity-b"]);
  assert.deepEqual(roomy.deferred, []);
});

test("due entities are ordered by tier, then distance, then id", () => {
  const group = [
    entity("entity-a", 0, 20),
    entity("entity-e", 0, 40),
    entity("entity-c", 6, 8),
    entity("entity-d", 0, 80),
    entity("entity-b", 3, 4)
  ];
  const ordered = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: group,
    tiers: [tier(10, 1), tier(30, 1), tier(50, 1)],
    tick: 0,
    max: 2
  });
  assert.deepEqual(ordered.due, ["entity-b", "entity-c"]);
  assert.deepEqual(ordered.deferred, ["entity-a", "entity-e"]);
  assert.deepEqual(ordered.culled, ["entity-d"]);
  assert.deepEqual(ordered.waiting, []);
  assert.deepEqual(ordered.tiers, [
    tierRow(10, 1, 2, 2, 0, 0),
    tierRow(30, 1, 1, 0, 1, 0),
    tierRow(50, 1, 1, 0, 1, 0)
  ]);
  assertPartition(group, ordered);
  const reversed = group.slice().reverse();
  const flipped = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: reversed,
    tiers: [tier(10, 1), tier(30, 1), tier(50, 1)],
    tick: 7,
    max: 2
  });
  assert.deepEqual(flipped.due, ordered.due);
  assert.deepEqual(flipped.deferred, ordered.deferred);
  assert.deepEqual(flipped.culled, ordered.culled);
  assert.deepEqual(
    group.map((entry) => entry.id),
    ["entity-a", "entity-e", "entity-c", "entity-d", "entity-b"]
  );
});

test("equal distances break the tie by id and not by input order", () => {
  const pair = [entity("entity-b", 3, 4), entity("entity-a", 3, 4)];
  const tied = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: pair,
    tiers: [tier(10, 1)],
    tick: 0,
    max: 1
  });
  assert.deepEqual(tied.due, ["entity-a"]);
  assert.deepEqual(tied.deferred, ["entity-b"]);
  assert.deepEqual(tied.waiting, []);
  assert.deepEqual(tied.culled, []);
  const swapped = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-a", 3, 4), entity("entity-b", 3, 4)],
    tiers: [tier(10, 1)],
    tick: 4,
    max: 1
  });
  assert.deepEqual(swapped.due, ["entity-a"]);
  assert.deepEqual(swapped.deferred, ["entity-b"]);
  const culled = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-b", 0, 10), entity("entity-a", 6, 8)],
    tiers: [tier(5, 1)],
    tick: 0
  });
  assert.deepEqual(culled.culled, ["entity-a", "entity-b"]);
  assert.deepEqual(culled.due, []);
});

test("a waiting near entity does not consume a cap slot", () => {
  const bands = [tier(10, 4), tier(50, 1)];
  const pair = [entity("entity-a", 6, 8), entity("entity-b", 0, 20)];
  const skipped = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: pair,
    tiers: bands,
    tick: 1,
    max: 1
  });
  assert.deepEqual(skipped.due, ["entity-b"]);
  assert.deepEqual(skipped.waiting, ["entity-a"]);
  assert.deepEqual(skipped.deferred, []);
  assert.deepEqual(skipped.tiers, [tierRow(10, 4, 1, 0, 0, 1), tierRow(50, 1, 1, 1, 0, 0)]);
  const claimed = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: pair,
    tiers: bands,
    tick: 0,
    max: 1
  });
  assert.deepEqual(claimed.due, ["entity-a"]);
  assert.deepEqual(claimed.deferred, ["entity-b"]);
  assert.deepEqual(claimed.waiting, []);
  assertPartition(pair, skipped);
  assertPartition(pair, claimed);
});

test("three dimensions use z and two dimensions do not", () => {
  const solid = selectUpdates({
    observer: { x: 0, y: 0, z: 0 },
    entities: [entity("entity-a", 3, 4, 0), entity("entity-b", 3, 4, 12)],
    tiers: [tier(10, 1)],
    tick: 0
  });
  assert.deepEqual(solid.due, ["entity-a"]);
  assert.deepEqual(solid.culled, ["entity-b"]);
  assert.equal(solid.tiers[0].count, 1);
  const flat = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-a", 3, 4), entity("entity-b", 3, 4)],
    tiers: [tier(10, 1)],
    tick: 0
  });
  assert.deepEqual(flat.due, ["entity-a", "entity-b"]);
  assert.deepEqual(flat.culled, []);
  const shifted = selectUpdates({
    observer: { x: 10, y: 10, z: -5 },
    entities: [entity("entity-a", 13, 14, -5)],
    tiers: [tier(10, 1)],
    tick: 2
  });
  assert.deepEqual(shifted.due, ["entity-a"]);
});

test("a distance equal to the tier maximum is inside and the next unit is outside", () => {
  const inside = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-a", 0, 10), entity("entity-b", 0, 11)],
    tiers: [tier(10, 1)],
    tick: 0
  });
  assert.deepEqual(inside.due, ["entity-a"]);
  assert.deepEqual(inside.culled, ["entity-b"]);
  const open = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-a", 0, 10), entity("entity-b", 0, 11)],
    tiers: [tier(10, 1), tier(30, 1)],
    tick: 0
  });
  assert.deepEqual(open.due, ["entity-a", "entity-b"]);
  assert.deepEqual(open.culled, []);
  assert.equal(open.tiers[0].count, 1);
  assert.equal(open.tiers[1].count, 1);
  const limit = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-a", 0, 30), entity("entity-b", 0, 31)],
    tiers: [tier(10, 1), tier(30, 1)],
    tick: 0
  });
  assert.deepEqual(limit.due, ["entity-a"]);
  assert.deepEqual(limit.culled, ["entity-b"]);
  assert.equal(limit.tiers[0].count, 0);
  assert.equal(limit.tiers[1].count, 1);
  const origin = selectUpdates({
    observer: { x: 5, y: 5 },
    entities: [entity("entity-a", 5, 5), entity("entity-b", 6, 5)],
    tiers: [tier(0, 1)],
    tick: 0
  });
  assert.deepEqual(origin.due, ["entity-a"]);
  assert.deepEqual(origin.culled, ["entity-b"]);
  const middle = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [
      entity("entity-a", 0, 3),
      entity("entity-b", 6, 8),
      entity("entity-c", 0, 20),
      entity("entity-d", 0, 31)
    ],
    tiers: [tier(5, 1), tier(15, 1), tier(30, 1)],
    tick: 0
  });
  assert.deepEqual(middle.due, ["entity-a", "entity-b", "entity-c"]);
  assert.deepEqual(middle.culled, ["entity-d"]);
  assert.deepEqual(
    middle.tiers.map((entry) => entry.count),
    [1, 1, 1]
  );
});

test("inputs are not mutated and two calls do not share result objects", () => {
  const position = { x: 6, y: 8 };
  const entry = { id: "entity-a", position, health: 4 };
  const list = [entry, entity("entity-b", 0, 20)];
  const options = {
    observer: { x: 0, y: 0 },
    entities: list,
    tiers: [tier(10, 1), tier(30, 1)],
    tick: 0,
    max: 1
  };
  const before = JSON.parse(JSON.stringify(options));
  const kept = selectUpdates(options);
  assert.deepEqual(options, before);
  assert.equal(list[0].position.x, 6);
  assert.equal(list[0].id, "entity-a");
  assert.deepEqual(kept.due, ["entity-a"]);
  assert.deepEqual(kept.deferred, ["entity-b"]);
  assert.deepEqual(
    list.map((item) => item.id),
    ["entity-a", "entity-b"]
  );
  assert.equal(Object.isFrozen(options), false);
  assert.equal(Object.isFrozen(list), false);
  entry.id = "entity-z";
  position.x = 1000;
  assert.deepEqual(kept.due, ["entity-a"]);
  assert.deepEqual(kept.deferred, ["entity-b"]);
  const second = selectUpdates(options);
  assert.deepEqual(second.culled, ["entity-z"]);
  assert.notEqual(kept, second);
  assert.notEqual(kept.due, second.due);
  assert.notEqual(kept.tiers, second.tiers);
  assert.notEqual(kept.tiers[0], second.tiers[0]);
  const third = selectUpdates(before);
  assert.deepEqual(third.due, kept.due);
  assert.deepEqual(third.deferred, kept.deferred);
  assert.notEqual(third.due, kept.due);
});

test("an empty entity list and an all-culled list still return every tier", () => {
  const empty = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [],
    tiers: [tier(10, 1), tier(20, 2)],
    tick: 3
  });
  assert.deepEqual(empty.due, []);
  assert.deepEqual(empty.deferred, []);
  assert.deepEqual(empty.waiting, []);
  assert.deepEqual(empty.culled, []);
  assert.equal(empty.tiers[0].count, 0);
  assert.equal(empty.tiers[1].count, 0);
  assert.equal(empty.tick, 3);
  assert.equal(empty.max, null);
  const far = selectUpdates({
    observer: { x: 0, y: 0 },
    entities: [entity("entity-b", 0, 20), entity("entity-a", 0, 10)],
    tiers: [tier(1, 1)],
    tick: 0
  });
  assert.deepEqual(far.due, []);
  assert.deepEqual(far.culled, ["entity-a", "entity-b"]);
  assert.equal(far.tiers[0].count, 0);
  assertFrozen(empty);
  assertFrozen(far);
});
