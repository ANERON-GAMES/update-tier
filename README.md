# @aneron/update-tier

Decide which entities an observer receives on a server tick from distance tiers.

## Purpose

`@aneron/update-tier` decides which entities one observer receives on one tick. The caller passes the observer position, the entities, a tier table, and the tick. Each tier is a maximum distance and an update interval in ticks. An entity is placed in the first tier whose maximum distance is greater than or equal to its distance from the observer. An entity farther than the last tier is culled. An entity inside a tier is due on this tick when `(tick + phase) mod interval` is `0`. The phase is a stable offset derived from the entity id, so entities that share a tier do not all become due on the same tick. When `max` is set, due entities are ordered by tier, then distance, then id, and only the first `max` are returned as due. The rest of that ordered list is deferred. Entities that are inside a tier but not due on this tick are waiting. The result reports those id lists and a count for each tier.

The module does not mutate its arguments. It does not read a clock, start a timer, draw a random number, or open a socket. It has no runtime dependencies.

## Install

The package is an ES module. It needs Node.js 20 or newer. It has no runtime dependencies. The package name is `@aneron/update-tier`. It is not published to the npm registry.

Clone this repository and run the tests:

```bash
git clone https://github.com/ANERON-GAMES/update-tier.git
cd update-tier
npm install
npm test
```

`npm test` runs `node --test`. `npm run lint` runs ESLint. `npm run format:check` runs Prettier.

Install it as a dependency from the git repository:

```bash
npm install github:ANERON-GAMES/update-tier
```

```js
import { selectUpdates } from "@aneron/update-tier";
```

Code in this repository imports the same entry point with `./src/index.js`.

## Usage

Distances below are in one unit chosen by the caller. The module does not treat them as metres or as any other named unit.

The tier table below is a near tier, a mid tier, and a far tier. The near tier reaches distance `10` and updates every tick. The mid tier reaches distance `30` and updates every `2` ticks. The far tier reaches distance `60` and updates every `4` ticks. Anything farther than `60` is culled.

```js
import { selectUpdates } from "@aneron/update-tier";

const entities = [
  { id: "entity-a", position: { x: 6, y: 8 } },
  { id: "entity-b", position: { x: 0, y: 20 } },
  { id: "entity-c", position: { x: 0, y: 40 } },
  { id: "entity-d", position: { x: 0, y: 90 } }
];

const tiers = [
  { distance: 10, interval: 1 },
  { distance: 30, interval: 2 },
  { distance: 60, interval: 4 }
];

const plan = selectUpdates({
  observer: { x: 0, y: 0 },
  entities,
  tiers,
  tick: 0
});
```

`entity-a` is at `(6, 8)`. The distance is `10`. That equals the first tier, so `entity-a` is in the near tier. Its interval is `1`, so it is due on tick `0`.

`entity-b` is at `(0, 20)`. The distance is `20`. That is past `10` and inside `30`, so `entity-b` is in the mid tier. Its interval is `2` and its phase is `1`. It is due when `tick % 2` is `1`. Tick `0` is not one of those ticks, so `entity-b` is waiting.

`entity-c` is at `(0, 40)`. The distance is `40`. That is past `30` and inside `60`, so `entity-c` is in the far tier. Its interval is `4` and its phase is `2`. It is due when `tick % 4` is `2`. Tick `0` is not one of those ticks, so `entity-c` is waiting.

`entity-d` is at `(0, 90)`. The distance is `90`, which is past `60`, so `entity-d` is culled.

`plan.tick` is `0`. `plan.max` is `null`. `plan.due` is `["entity-a"]`. `plan.deferred` is `[]`. `plan.waiting` is `["entity-b", "entity-c"]`. `plan.culled` is `["entity-d"]`. `plan.tiers[0].count` is `1`. `plan.tiers[0].due` is `1`. `plan.tiers[1].waiting` is `1`. `plan.tiers[2].waiting` is `1`. `plan.tiers[2].count` is `1`.

Tick `1` makes the mid entity due. `entity-b` is due because `1 % 2` is `1`. `entity-c` is still waiting because `1 % 4` is not `2`. The due list is ordered by tier, so the near id comes first.

```js
const next = selectUpdates({
  observer: { x: 0, y: 0 },
  entities,
  tiers,
  tick: 1
});
```

`next.due` is `["entity-a", "entity-b"]`. `next.waiting` is `["entity-c"]`. `next.culled` is `["entity-d"]`. `next.deferred` is `[]`. `plan.due` is still `["entity-a"]`. The first call is not affected by the second. `entities[0].position.x` is still `6`.

Tick `2` makes the far entity due and the mid entity wait. `2 % 4` is `2`, which is the residue of `entity-c`. `2 % 2` is `0`, and `entity-b` needs `1`.

```js
const later = selectUpdates({
  observer: { x: 0, y: 0 },
  entities,
  tiers,
  tick: 2
});
```

`later.due` is `["entity-a", "entity-c"]`. `later.waiting` is `["entity-b"]`. `later.culled` is `["entity-d"]`.

Tick `4` repeats tick `0`. Adding the interval to the tick does not change the decision for an entity that stayed in the same tier.

```js
const repeated = selectUpdates({
  observer: { x: 0, y: 0 },
  entities,
  tiers,
  tick: 4
});
```

`repeated.due` is `["entity-a"]`. `repeated.waiting` is `["entity-b", "entity-c"]`. `repeated.culled` is `["entity-d"]`.

A cap of `1` on tick `1` keeps the nearer due entity. `entity-a` and `entity-b` are both due. `entity-a` is in an earlier tier, so it is kept. `entity-b` is deferred. `entity-c` is waiting, so it is not part of the cap. `entity-d` stays culled.

```js
const capped = selectUpdates({
  observer: { x: 0, y: 0 },
  entities,
  tiers,
  tick: 1,
  max: 1
});
```

`capped.due` is `["entity-a"]`. `capped.deferred` is `["entity-b"]`. `capped.max` is `1`. `capped.waiting` is `["entity-c"]`. `capped.culled` is `["entity-d"]`. `capped.tiers[1].deferred` is `1`. `capped.tiers[1].due` is `0`.

The same order applies when every in-range entity is due. Distances are `5`, `10`, `20`, `40`, and `80`. The tier boundaries are `10`, `30`, and `50`. `entity-b` and `entity-c` share the first tier, and `entity-b` is closer. `entity-a` is in the second tier. `entity-e` is in the third tier. `entity-d` is culled. The input lists `entity-a` first. The result does not. With `max` of `2`, the prefix is the two closest due ids and the overflow follows in the same order.

```js
const ordered = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: [
    { id: "entity-a", position: { x: 0, y: 20 } },
    { id: "entity-e", position: { x: 0, y: 40 } },
    { id: "entity-c", position: { x: 6, y: 8 } },
    { id: "entity-d", position: { x: 0, y: 80 } },
    { id: "entity-b", position: { x: 3, y: 4 } }
  ],
  tiers: [
    { distance: 10, interval: 1 },
    { distance: 30, interval: 1 },
    { distance: 50, interval: 1 }
  ],
  tick: 0,
  max: 2
});
```

`ordered.due` is `["entity-b", "entity-c"]`. `ordered.deferred` is `["entity-a", "entity-e"]`. `ordered.culled` is `["entity-d"]`. `ordered.waiting` is `[]`.

Equal distances use the id. Both entities are at `(3, 4)`, so both distances are `5`. `"entity-a"` is before `"entity-b"`. The input lists `entity-b` first. `max` is `1`.

```js
const tied = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: [
    { id: "entity-b", position: { x: 3, y: 4 } },
    { id: "entity-a", position: { x: 3, y: 4 } }
  ],
  tiers: [{ distance: 10, interval: 1 }],
  tick: 0,
  max: 1
});
```

`tied.due` is `["entity-a"]`. `tied.deferred` is `["entity-b"]`.

A waiting entity does not take a slot from a farther entity that is due. The near tier has interval `4`. `entity-a` has phase `0`, so it is due when `tick % 4` is `0`. On tick `1` it is waiting. The far tier has interval `1`, so `entity-b` is due on every tick. `max` is `1`. The slot goes to `entity-b`.

```js
const skipped = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: [
    { id: "entity-a", position: { x: 6, y: 8 } },
    { id: "entity-b", position: { x: 0, y: 20 } }
  ],
  tiers: [
    { distance: 10, interval: 4 },
    { distance: 50, interval: 1 }
  ],
  tick: 1,
  max: 1
});
```

`skipped.due` is `["entity-b"]`. `skipped.waiting` is `["entity-a"]`. `skipped.deferred` is `[]`.

On tick `0` both are due. The near tier comes first, so `entity-a` takes the only slot and `entity-b` is deferred.

```js
const claimed = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: [
    { id: "entity-a", position: { x: 6, y: 8 } },
    { id: "entity-b", position: { x: 0, y: 20 } }
  ],
  tiers: [
    { distance: 10, interval: 4 },
    { distance: 50, interval: 1 }
  ],
  tick: 0,
  max: 1
});
```

`claimed.due` is `["entity-a"]`. `claimed.deferred` is `["entity-b"]`. `claimed.waiting` is `[]`.

Four entities in one tier of interval `4` land on four different ticks. The phases are `0`, `1`, `2`, and `3`. Each tick sends one id. The other three are waiting, ordered by distance.

```js
const spreadEntities = [
  { id: "entity-a", position: { x: 6, y: 8 } },
  { id: "entity-b", position: { x: 0, y: 20 } },
  { id: "entity-c", position: { x: 0, y: 30 } },
  { id: "entity-d", position: { x: 0, y: 40 } }
];

const spread = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: spreadEntities,
  tiers: [{ distance: 100, interval: 4 }],
  tick: 0
});
```

`spread.due` is `["entity-a"]`. `spread.waiting` is `["entity-b", "entity-c", "entity-d"]`.

```js
const second = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: spreadEntities,
  tiers: [{ distance: 100, interval: 4 }],
  tick: 1
});
```

`second.due` is `["entity-d"]`. `second.waiting` is `["entity-a", "entity-b", "entity-c"]`.

```js
const third = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: spreadEntities,
  tiers: [{ distance: 100, interval: 4 }],
  tick: 2
});
```

`third.due` is `["entity-c"]`. `third.waiting` is `["entity-a", "entity-b", "entity-d"]`.

```js
const fourth = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: spreadEntities,
  tiers: [{ distance: 100, interval: 4 }],
  tick: 3
});
```

`fourth.due` is `["entity-b"]`. `fourth.waiting` is `["entity-a", "entity-c", "entity-d"]`.

The same four ticks with forty ids, `entity-0` through `entity-39`, in one tier of interval `4` produce due counts `11`, `11`, `9`, and `9`. The due counts for ticks `0`, `1`, `2`, and `3` are `11`, `11`, `9`, and `9`. Each of those ids is due on exactly one of the four ticks.

A three-dimensional observer uses `z`. `entity-a` at `(3, 4, 0)` has distance `5` and is inside a tier of `10`. `entity-b` at `(3, 4, 12)` has distance `13` and is culled. The same `x` and `y` without `z` are both distance `5`.

```js
const solid = selectUpdates({
  observer: { x: 0, y: 0, z: 0 },
  entities: [
    { id: "entity-a", position: { x: 3, y: 4, z: 0 } },
    { id: "entity-b", position: { x: 3, y: 4, z: 12 } }
  ],
  tiers: [{ distance: 10, interval: 1 }],
  tick: 0
});
```

`solid.due` is `["entity-a"]`. `solid.culled` is `["entity-b"]`.

```js
const flat = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: [
    { id: "entity-a", position: { x: 3, y: 4 } },
    { id: "entity-b", position: { x: 3, y: 4 } }
  ],
  tiers: [{ distance: 10, interval: 1 }],
  tick: 0
});
```

`flat.due` is `["entity-a", "entity-b"]`. `flat.culled` is `[]`.

A distance equal to the tier maximum is inside. The next unit is outside when it is past the last tier.

```js
const inside = selectUpdates({
  observer: { x: 0, y: 0 },
  entities: [
    { id: "entity-a", position: { x: 0, y: 10 } },
    { id: "entity-b", position: { x: 0, y: 11 } }
  ],
  tiers: [{ distance: 10, interval: 1 }],
  tick: 0
});
```

`inside.due` is `["entity-a"]`. `inside.culled` is `["entity-b"]`.

The calls above do not write into the arrays they were given. `list[0].position.x` is still `6` after a call that reads a position of `{ x: 6, y: 8 }`. `list[0].id` is still `"entity-a"`.

## API

`selectUpdates` is a function. It has no constructor and no shared state. Each call reads its argument and returns a new result. The same input produces a deep-equal result and a new object tree.

`selectUpdates` does not mutate `options`, the observer, the `entities` array, entity objects, position objects, the `tiers` array, or tier objects. A call freezes only the result it creates. The result, `due`, `deferred`, `waiting`, `culled`, `tiers`, and each tier entry are frozen.

Own fields are read. Unknown fields are ignored. An omitted optional field, or a field whose value is `undefined`, uses the default. A frozen object and an object with a null prototype are accepted. Inherited fields are ignored.

Coordinates and tier distances share one unit. The module does not convert that unit. Comparison is ordinary IEEE-754 with no epsilon. `-0` is stored as `0` on the tick, the max, and the tier distances this module writes. `-0` compares equal to `0` before that normalisation.

### `selectUpdates(options)`

```js
selectUpdates(options);
```

`options` must be an object and must not be an array. Otherwise the function throws `TypeError` with the message `options must be an object`.

Checks run in this order. The first failure wins. A throw returns no result.

1. `options` is an object.
2. `observer` is an object with finite `x` and `y`. An own `z` must be finite. That fixes the dimension for the call.
3. `entities` is an array. Each entry is read in order: object, non-empty string `id`, unique `id`, position object, finite `x`, finite `y`, then `z` matches the observer dimension.
4. `tiers` is a non-empty array. Each entry is read in order: object, finite `distance` greater than or equal to `0`, `distance` strictly greater than the previous tier, integer `interval` greater than or equal to `1`.
5. `tick` is an own property and an integer greater than or equal to `0`.
6. `max`, when present and not `undefined`, is an integer greater than or equal to `0`.
7. Distances are measured in entity order. A non-finite distance throws.

| Field      | Default  | Accepted values                                                                                          |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `observer` | required | `{ x, y }` or `{ x, y, z }` with finite numbers. An own `z` selects 3D.                                  |
| `entities` | required | An array of entity objects. An empty array is valid. Order is not the result order.                      |
| `tiers`    | required | A non-empty array of `{ distance, interval }`. Distance order is the tier order.                         |
| `tick`     | required | A safe integer greater than or equal to `0`. `-0` is stored as `0`.                                      |
| `max`      | `null`   | A safe integer greater than or equal to `0`, or omitted. `-0` is stored as `0` and caps the list at `0`. |

Integer means `Number.isSafeInteger`. `1.0` is accepted. `1.5`, `Infinity`, and `Number.MAX_SAFE_INTEGER + 1` are rejected. Tier `distance` is not required to be an integer. `10.5` is a valid distance.

### `options.observer`

`observer` must be an own property whose value is an object and not an array. Otherwise `TypeError`: `observer must be an object`.

`x` must be an own finite number. Otherwise `RangeError`: `observer x must be a finite number`.

`y` must be an own finite number. Otherwise `RangeError`: `observer y must be a finite number`.

If `z` is an own property, it must be a finite number. Otherwise `RangeError`: `observer z must be a finite number`. The call is then three-dimensional. If `z` is not an own property, the call is two-dimensional. An inherited `z` does not make the call three-dimensional.

Unknown observer fields are ignored. `-0` is read as `0` for the distance calculation. The observer is not copied onto the result.

### `options.entities`

`entities` must be an own property whose value is an array. Otherwise `TypeError`: `entities must be an array`. An empty array is valid. The result lists are then empty and every tier count is `0`.

A hole in the array is `undefined` and fails the object check.

Each entry must be an object and must not be an array. Otherwise `TypeError`: `entity must be an object`.

Each entity is read in order:

1. `id` must be an own property whose value is a string of length at least `1`. Otherwise `TypeError`: `entity id must be a non-empty string`.
2. That id must not already have been seen. Otherwise `TypeError`: `entity ids must be unique`.
3. `position` must be an own property whose value is an object and not an array. Otherwise `TypeError`: `position must be an object`.

Unknown entity fields are ignored. Ids are not trimmed and are not case-folded. `"entity-a"` and `"entity-A"` are different ids. A string of one space is a valid id. `"__proto__"` and `"constructor"` are valid ids.

The duplicate check happens before the position is validated. A repeated id with a bad position reports the duplicate. A bad id is reported before the position. The first entity is finished before the second entity is read.

### `options.entities[].position`

`x` must be an own finite number. Otherwise `RangeError`: `position x must be a finite number`.

`y` must be an own finite number. Otherwise `RangeError`: `position y must be a finite number`.

For a two-dimensional observer, an own `z` of any value, including `undefined`, throws `TypeError`: `position must be two-dimensional`. `x` and `y` are checked before that.

For a three-dimensional observer, a missing `z` throws `TypeError`: `position must be three-dimensional`. A present `z` that is not a finite number throws `RangeError`: `position z must be a finite number`.

A two-dimensional position and a three-dimensional position are not interchangeable. `z: 0` is a different point from a missing `z`. The distance formulas are:

- Two dimensions: `Math.hypot(x1 - x0, y1 - y0)`.
- Three dimensions: `Math.hypot(x1 - x0, y1 - y0, z1 - z0)`.

`(6, 8)` is distance `10`. `(3, 4)` is distance `5`. `(2, 3, 6)` is distance `7`. `(3, 4, 12)` is distance `13`.

If the computed distance is not finite, `selectUpdates` throws `RangeError` with the message `distance must be finite`. `Math.hypot(Number.MAX_VALUE, Number.MAX_VALUE)` is not finite. That entity is not culled. The error is reported. A finite distance such as `1e200` is compared with the tiers normally. Distances are measured only after the input checks above have passed, and they are measured in entity order. A later invalid position is reported before an earlier non-finite distance.

### `options.tiers`

`tiers` must be an own property whose value is a non-empty array. Otherwise `TypeError`: `tiers must be a non-empty array`.

Each entry must be an object and must not be an array. Otherwise `TypeError`: `tier must be an object`.

Each tier is read in order:

1. `distance` must be an own finite number greater than or equal to `0`. Otherwise `RangeError`: `tier distance must be a finite number greater than or equal to 0`. `-0` is stored as `0`.
2. That distance must be strictly greater than the previous tier's stored distance. Otherwise `RangeError`: `tier distances must increase`. A tier of `-0` followed by `0` does not increase, because both are stored as `0`.
3. `interval` must be an own safe integer greater than or equal to `1`. Otherwise `RangeError`: `tier interval must be an integer greater than or equal to 1`.

A distance that does not increase is reported before that tier's interval is read. Unknown tier fields are ignored. Intervals do not have to increase. A nearer tier may have a larger interval than a farther tier.

An entity is assigned to the first tier with `distance <= tier.distance`. The comparison has no epsilon. An entity past the last tier is culled. A tier whose distance is `0` contains only entities at distance `0`.

### `options.tick`

`tick` must be an own property. A missing tick, an inherited tick, and a present value that is not a safe integer greater than or equal to `0` all throw `RangeError`: `tick must be an integer greater than or equal to 0`.

`-0` is stored as `0`. `Number.MAX_SAFE_INTEGER` is accepted. The module does not know which tick is current. The caller passes it.

### `options.max`

`max` is the per-tick cap. The default is no cap. The field may be omitted or be `undefined`. The result then stores `max` as `null`, and `deferred` is empty.

A present value other than `undefined` must be a safe integer greater than or equal to `0`. Otherwise `RangeError`: `max must be an integer greater than or equal to 0`. `null` is rejected. `-0` is stored as `0`.

The cap is applied to due entities after they are ordered. Waiting entities do not consume a slot. Culled entities do not consume a slot.

Let `limit` be the number of due entities when `max` is `null`, and `max` otherwise.

- `due` is the first `limit` ids of the ordered due list.
- `deferred` is the remainder of that list, in the same order.

`max` of `0` defers every due entity. `max` greater than the number of due entities defers nobody. `max` equal to that number defers nobody.

### Schedule

The phase of an entity is `fnv1a32(id) % interval`.

`fnv1a32` is FNV-1a 32-bit over the UTF-16 code units of the id:

1. Start with `2166136261`.
2. For each code unit, replace the hash with `hash XOR code`, then with `Math.imul(hash, 16777619)`.
3. Take the unsigned 32-bit value (`hash >>> 0`).

The FNV-1a 32-bit value of the empty string is `2166136261`. The FNV-1a 32-bit value of `"a"` is `3826002220`.

`entity-a` modulo `4` is `0`. `entity-b` modulo `4` is `1`. `entity-c` modulo `4` is `2`. `entity-d` modulo `4` is `3`.

An entity is due when `tick % interval` equals `(interval - phase) % interval`. That is the exact integer condition `(tick + phase) mod interval = 0`. `phase` is in `0 .. interval - 1`. The implementation reduces `tick` and `interval - phase` before it compares them, so the decision stays exact for every accepted tick and interval.

| id         | phase for interval 4 | due when `tick % 4` is |
| ---------- | -------------------- | ---------------------- |
| `entity-a` | `0`                  | `0`                    |
| `entity-b` | `1`                  | `3`                    |
| `entity-c` | `2`                  | `2`                    |
| `entity-d` | `3`                  | `1`                    |

For interval `2`, `entity-a` has phase `0` and is due when `tick % 2` is `0`. `entity-b` has phase `1` and is due when `tick % 2` is `1`.

`(interval - phase) % interval` is `0` when the phase is `0`, and `interval - phase` otherwise. Interval `1` has phase `0` for every id. `tick % 1` is `0`, so an entity in that tier is due on every tick.

Each id is due on exactly one residue class of its interval. Over any `interval` consecutive ticks, the entity is due once, provided it stays in a tier with that interval. Tick `t` and tick `t + interval` produce the same due decision for that entity.

The hash does not use the position, the tick, or the tier distance. Moving an entity inside a tier with the same interval does not change the ticks on which it is due. Moving it into a tier with a different interval can change the phase, because the modulus changes. Culling removes the entity from the schedule for that call. The phase is not consulted for a culled entity.

The 32-bit hash cannot occupy every residue when `interval` is greater than `4294967296`. Residues below `4294967296` remain reachable. The due rule is unchanged.

### Result

The return value is a frozen object:

| Field      | Meaning                                                     |
| ---------- | ----------------------------------------------------------- |
| `tick`     | The tick used for this call.                                |
| `max`      | The cap used for this call, or `null` when there is no cap. |
| `due`      | Ids that are sent on this tick, after the cap.              |
| `deferred` | Ids that were due and did not fit in the cap.               |
| `waiting`  | Ids inside a tier that are not due on this tick.            |
| `culled`   | Ids farther than the last tier.                             |
| `tiers`    | One frozen entry per input tier, in input order.            |

`due`, `deferred`, and `waiting` are ordered by tier index, then by distance ascending, then by id. The id order is UTF-16 code unit order, the same order as `<` on strings. `"entity-A"` is before `"entity-a"`. The input order is not used.

`culled` is ordered by distance ascending, then by id. Tier index is not used, because a culled entity has no tier.

`due` and `deferred` together are the due entities, in that order. `due` is a prefix. `deferred` is the tail. When `max` is `null`, `deferred` is empty and `due` is the full ordered list.

Every input id appears in exactly one of the four lists. The lists do not share ids. Reversing the entity array does not change the lists.

Tier ranges do not overlap. An entity in an earlier tier is strictly closer than an entity in a later tier, or it sits on the earlier boundary. Sorting by tier and then by distance agrees with sorting by distance and then by tier. The id is the only tie break, and equal distances fall in the same tier.

Each tier entry is a frozen object:

| Field      | Meaning                                                |
| ---------- | ------------------------------------------------------ |
| `distance` | The tier maximum used for this call.                   |
| `interval` | The interval used for this call.                       |
| `count`    | Entities assigned to this tier.                        |
| `due`      | Entities in this tier that are in the `due` list.      |
| `deferred` | Entities in this tier that are in the `deferred` list. |
| `waiting`  | Entities in this tier that are in the `waiting` list.  |

`count` equals `due + deferred + waiting`. Culled entities are not included in a tier count. The sum of the tier counts plus `culled.length` equals the number of entities. The sum of the tier `due` fields equals `due.length`, and the same is true for `deferred` and `waiting`.

The result does not include positions or distances. It does not share object or array references with the input or with another call.

### Errors

| When the check fails                                                      | Error        | Message                                                            |
| ------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| `options` is missing, an array, or not an object                          | `TypeError`  | `options must be an object`                                        |
| `observer` is missing, an array, or not an object                         | `TypeError`  | `observer must be an object`                                       |
| `observer.x` is missing or not a finite number                            | `RangeError` | `observer x must be a finite number`                               |
| `observer.y` is missing or not a finite number                            | `RangeError` | `observer y must be a finite number`                               |
| `observer.z` is present and not a finite number                           | `RangeError` | `observer z must be a finite number`                               |
| `entities` is missing or not an array                                     | `TypeError`  | `entities must be an array`                                        |
| An entity entry is an array or not an object                              | `TypeError`  | `entity must be an object`                                         |
| An entity id is not a non-empty string                                    | `TypeError`  | `entity id must be a non-empty string`                             |
| An entity id is repeated                                                  | `TypeError`  | `entity ids must be unique`                                        |
| `position` is missing, an array, or not an object                         | `TypeError`  | `position must be an object`                                       |
| `position.x` is missing or not a finite number                            | `RangeError` | `position x must be a finite number`                               |
| `position.y` is missing or not a finite number                            | `RangeError` | `position y must be a finite number`                               |
| A two-dimensional call has an own `position.z`                            | `TypeError`  | `position must be two-dimensional`                                 |
| A three-dimensional call has no own `position.z`                          | `TypeError`  | `position must be three-dimensional`                               |
| `position.z` is present and not a finite number                           | `RangeError` | `position z must be a finite number`                               |
| `tiers` is missing, empty, or not an array                                | `TypeError`  | `tiers must be a non-empty array`                                  |
| A tier entry is an array or not an object                                 | `TypeError`  | `tier must be an object`                                           |
| A tier distance is missing, not finite, or below `0`                      | `RangeError` | `tier distance must be a finite number greater than or equal to 0` |
| A tier distance is not strictly greater than the previous one             | `RangeError` | `tier distances must increase`                                     |
| A tier interval is missing or not an integer greater than or equal to `1` | `RangeError` | `tier interval must be an integer greater than or equal to 1`      |
| `tick` is missing or not an integer greater than or equal to `0`          | `RangeError` | `tick must be an integer greater than or equal to 0`               |
| `max` is present and not an integer greater than or equal to `0`          | `RangeError` | `max must be an integer greater than or equal to 0`                |
| A measured distance is not finite                                         | `RangeError` | `distance must be finite`                                          |

## Design

Tiers exist so a near entity can update every tick while a far entity updates less often. One radius would send every in-range entity at the same rate. The table is ordered from near to far. The first matching maximum wins, and the maximum is inclusive, so an entity standing on the boundary keeps the faster tier. The next tier starts strictly above that distance.

The last tier is a hard cull. An entity beyond it is not given a slower interval. A caller who wants a farther band adds a tier. A distance of `0` is a real tier. It contains only entities that share the observer's position. It does not mean "the rest".

Without a phase, every entity in an interval-4 tier would be due on the same tick and idle for three ticks. The cap would then drop the same set every fourth tick. The id hash gives each entity a stable residue so the updates of that tier are spread across the interval. The same entity keeps its residue from tick to tick. Two callers that share ids, positions, tiers, and the tick make the same decision. The module does not call `Math.random`.

The hash is FNV-1a 32-bit because a one-character difference has to move the residue. `entity-a`, `entity-b`, `entity-c`, and `entity-d` land on phases `0`, `1`, `2`, and `3` for interval `4`. They occupy four different ticks. A set of forty ids from `entity-0` through `entity-39` is not a perfect four-way split, and it is not piled onto one tick. The due counts for ticks `0`, `1`, `2`, and `3` are `11`, `11`, `9`, and `9`.

The cap is applied after the phase test. A waiting entity is inside the world but it is not scheduled on this tick, so it does not consume a slot. Deferred ids are the due ids that did not fit. They are the tail of the ordered due list, not a second sort and not the entities that were farthest in the whole set. On a tick where the near entity is waiting, a farther due entity can be sent. On a tick where both are due, the nearer tier wins the slot.

The order is tier, then distance, then id. Tier ranges do not overlap, so an earlier tier is closer than a later tier. Inside a tier, a smaller distance comes first. Equal distances use the id string. The caller does not have to pre-sort entities. Reversing the input does not change the result. `"entity-A"` wins a tie with `"entity-a"` because the code unit `A` is before `a`. The spelling is not folded.

`count` is every entity assigned to the tier. It equals `due + deferred + waiting`, so a tier can be audited without reconstructing the lists. Culled entities stay out of those counts. An empty world still returns one entry per tier, with zeros, so the tier table the caller passed is visible on the result.

Two dimensions and three dimensions are separate calls. Treating a missing `z` as `0` would pull a flat position into a volume, or the reverse. The observer's own `z` is the switch. Entity positions must match. An inherited `z` is not a switch, because the module reads own fields only.

A non-finite distance is an error rather than a cull. `Number.MAX_VALUE` on two axes overflows `Math.hypot`. That overflow is not a distance the caller wrote. A huge finite distance, such as `1e200`, is still a normal comparison and can be culled by a small tier.

The result is a pure reduction of the positions and the tick the caller already has. The module does not read a clock, wait, or generate a number. Inputs stay mutable for the caller. Two calls do not share result objects, so freezing one result cannot change the next call. A later edit to a position is visible only to a later call. The earlier frozen result keeps the ids it selected.

## License

MIT. Copyright (c) 2026 Vadim Gubin.
