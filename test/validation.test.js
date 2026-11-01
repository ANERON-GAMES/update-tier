import assert from "node:assert/strict";
import test from "node:test";
import { selectUpdates } from "../src/index.js";
import { entity, tier, valid } from "./helpers.js";

const OPTIONS = "options must be an object";
const OBSERVER = "observer must be an object";
const OBSERVER_X = "observer x must be a finite number";
const OBSERVER_Y = "observer y must be a finite number";
const OBSERVER_Z = "observer z must be a finite number";
const ENTITIES = "entities must be an array";
const ENTITY = "entity must be an object";
const ENTITY_ID = "entity id must be a non-empty string";
const ENTITY_UNIQUE = "entity ids must be unique";
const POSITION = "position must be an object";
const POSITION_X = "position x must be a finite number";
const POSITION_Y = "position y must be a finite number";
const POSITION_Z = "position z must be a finite number";
const POSITION_TWO = "position must be two-dimensional";
const POSITION_THREE = "position must be three-dimensional";
const TIERS = "tiers must be a non-empty array";
const TIER = "tier must be an object";
const DISTANCE = "tier distance must be a finite number greater than or equal to 0";
const ORDER = "tier distances must increase";
const INTERVAL = "tier interval must be an integer greater than or equal to 1";
const TICK = "tick must be an integer greater than or equal to 0";
const MAX = "max must be an integer greater than or equal to 0";
const LENGTH = "distance must be finite";

test("selectUpdates rejects a bad options object before it reads fields", () => {
  assert.throws(() => selectUpdates(), {
    name: "TypeError",
    message: OPTIONS
  });
  for (const options of [undefined, null, [], "tick", 1, true, false, () => {}]) {
    assert.throws(() => selectUpdates(options), {
      name: "TypeError",
      message: OPTIONS
    });
  }
});

test("selectUpdates reads observer, entities, tiers, tick, max, then distances", () => {
  assert.throws(() => selectUpdates({}), {
    name: "TypeError",
    message: OBSERVER
  });
  assert.throws(
    () =>
      selectUpdates({
        entities: null,
        tiers: [],
        tick: -1,
        max: -1
      }),
    {
      name: "TypeError",
      message: OBSERVER
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { y: 0 },
        entities: null,
        tiers: [],
        tick: -1
      }),
    {
      name: "RangeError",
      message: OBSERVER_X
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0 },
        entities: null,
        tiers: [],
        tick: -1
      }),
    {
      name: "RangeError",
      message: OBSERVER_Y
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0, y: 0, z: Number.NaN },
        entities: null,
        tiers: [],
        tick: -1
      }),
    {
      name: "RangeError",
      message: OBSERVER_Z
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0, y: 0 },
        entities: "entity-a",
        tiers: [],
        tick: -1,
        max: -1
      }),
    {
      name: "TypeError",
      message: ENTITIES
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0, y: 0 },
        entities: [{ id: "", position: null }],
        tiers: [],
        tick: -1
      }),
    {
      name: "TypeError",
      message: ENTITY_ID
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0, y: 0 },
        entities: [entity("entity-a", Number.MAX_VALUE, Number.MAX_VALUE)],
        tiers: [],
        tick: -1
      }),
    {
      name: "TypeError",
      message: TIERS
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0, y: 0 },
        entities: [entity("entity-a", Number.MAX_VALUE, Number.MAX_VALUE)],
        tiers: [tier(10, 1)],
        tick: -1,
        max: -1
      }),
    {
      name: "RangeError",
      message: TICK
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0, y: 0 },
        entities: [entity("entity-a", Number.MAX_VALUE, Number.MAX_VALUE)],
        tiers: [tier(10, 1)],
        tick: 0,
        max: -1
      }),
    {
      name: "RangeError",
      message: MAX
    }
  );
  assert.throws(
    () =>
      selectUpdates({
        observer: { x: 0, y: 0 },
        entities: [entity("entity-a", Number.MAX_VALUE, Number.MAX_VALUE)],
        tiers: [tier(10, 1)],
        tick: 0
      }),
    {
      name: "RangeError",
      message: LENGTH
    }
  );
});

test("observer axes are own finite numbers and z selects the dimension", () => {
  for (const observer of [null, [], "origin", 0, true]) {
    assert.throws(() => selectUpdates(valid({ observer })), {
      name: "TypeError",
      message: OBSERVER
    });
  }
  for (const x of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, "0", true, false]) {
    assert.throws(() => selectUpdates(valid({ observer: { x, y: 0 } })), {
      name: "RangeError",
      message: OBSERVER_X
    });
  }
  for (const y of [undefined, null, Number.NaN, Number.NEGATIVE_INFINITY, "0", true]) {
    assert.throws(() => selectUpdates(valid({ observer: { x: 0, y } })), {
      name: "RangeError",
      message: OBSERVER_Y
    });
  }
  for (const z of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, "0", true]) {
    assert.throws(() => selectUpdates(valid({ observer: { x: 0, y: 0, z } })), {
      name: "RangeError",
      message: OBSERVER_Z
    });
  }
  const inherited = Object.create({ x: 0, y: 0 });
  assert.throws(() => selectUpdates(valid({ observer: inherited })), {
    name: "RangeError",
    message: OBSERVER_X
  });
  const flat = Object.create({ z: 100 });
  flat.x = 0;
  flat.y = 0;
  const ignoredZ = selectUpdates(
    valid({
      observer: flat,
      entities: [entity("entity-a", 3, 4)]
    })
  );
  assert.deepEqual(ignoredZ.due, ["entity-a"]);
  assert.equal(Object.hasOwn(ignoredZ, "z"), false);
  const bare = Object.create(null);
  bare.x = -0;
  bare.y = 0;
  const fromNull = selectUpdates(
    valid({
      observer: bare,
      entities: [entity("entity-a", 0, 0)]
    })
  );
  assert.deepEqual(fromNull.due, ["entity-a"]);
});

test("entities must be an array of objects with unique non-empty ids", () => {
  for (const entities of [undefined, null, "entity-a", { id: "entity-a" }, 1]) {
    assert.throws(() => selectUpdates(valid({ entities })), {
      name: "TypeError",
      message: ENTITIES
    });
  }
  const empty = selectUpdates(valid({ entities: [] }));
  assert.deepEqual(empty.due, []);
  assert.deepEqual(empty.culled, []);
  assert.equal(empty.tiers[0].count, 0);
  for (const entry of [null, [], "entity-a", 1, true, undefined]) {
    assert.throws(() => selectUpdates(valid({ entities: [entry] })), {
      name: "TypeError",
      message: ENTITY
    });
  }
  const hole = [entity("entity-a", 1, 0)];
  hole.length = 2;
  assert.throws(() => selectUpdates(valid({ entities: hole })), {
    name: "TypeError",
    message: ENTITY
  });
  assert.throws(() => selectUpdates(valid({ entities: [{ position: { x: 1, y: 0 } }] })), {
    name: "TypeError",
    message: ENTITY_ID
  });
  for (const id of ["", 1, null, undefined, true, ["entity-a"]]) {
    assert.throws(
      () =>
        selectUpdates(
          valid({
            entities: [{ id, position: { x: 1, y: 0 } }]
          })
        ),
      {
        name: "TypeError",
        message: ENTITY_ID
      }
    );
  }
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [entity("entity-a", 1, 0), { id: "entity-a", position: null }]
        })
      ),
    {
      name: "TypeError",
      message: ENTITY_UNIQUE
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [entity("entity-b", 1, 0), entity("entity-a", 1, 0), entity("entity-b", 2, 0)]
        })
      ),
    {
      name: "TypeError",
      message: ENTITY_UNIQUE
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [
            { id: "entity-a", position: null },
            { id: "entity-a", position: { x: 1, y: 0 } }
          ]
        })
      ),
    {
      name: "TypeError",
      message: POSITION
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [entity("entity-a", 1, 0), { id: "", position: { x: 1, y: 0 } }]
        })
      ),
    {
      name: "TypeError",
      message: ENTITY_ID
    }
  );
  const distinct = selectUpdates(
    valid({
      entities: [entity("entity-A", 0, 0), entity("entity-a", 0, 0)],
      max: 1
    })
  );
  assert.deepEqual(distinct.due, ["entity-A"]);
  assert.deepEqual(distinct.deferred, ["entity-a"]);
  const spaced = selectUpdates(
    valid({
      entities: [
        { id: " ", position: { x: 0, y: 0 } },
        { id: "  ", position: { x: 0, y: 1 } }
      ]
    })
  );
  assert.deepEqual(spaced.due, [" ", "  "]);
  const internal = selectUpdates(
    valid({
      entities: [entity("__proto__", 1, 0), entity("constructor", 2, 0)]
    })
  );
  assert.deepEqual(internal.due, ["__proto__", "constructor"]);
});

test("positions match the observer dimension and use own finite axes", () => {
  assert.throws(() => selectUpdates(valid({ entities: [{ id: "entity-a" }] })), {
    name: "TypeError",
    message: POSITION
  });
  for (const position of [null, [], "1,0", 1, true]) {
    assert.throws(() => selectUpdates(valid({ entities: [{ id: "entity-a", position }] })), {
      name: "TypeError",
      message: POSITION
    });
  }
  for (const x of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, "0", true, 1n]) {
    assert.throws(
      () =>
        selectUpdates(
          valid({
            entities: [{ id: "entity-a", position: { x, y: 0 } }]
          })
        ),
      {
        name: "RangeError",
        message: POSITION_X
      }
    );
  }
  for (const y of [undefined, null, Number.NaN, Number.NEGATIVE_INFINITY, "0", false]) {
    assert.throws(
      () =>
        selectUpdates(
          valid({
            entities: [{ id: "entity-a", position: { x: 0, y } }]
          })
        ),
      {
        name: "RangeError",
        message: POSITION_Y
      }
    );
  }
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [{ id: "entity-a", position: { x: Number.NaN, y: 0, z: 1 } }]
        })
      ),
    {
      name: "RangeError",
      message: POSITION_X
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [{ id: "entity-a", position: { x: 1, y: Number.NaN, z: 1 } }]
        })
      ),
    {
      name: "RangeError",
      message: POSITION_Y
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [{ id: "entity-a", position: { x: 1, y: 2, z: 1 } }]
        })
      ),
    {
      name: "TypeError",
      message: POSITION_TWO
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [{ id: "entity-a", position: { x: 1, y: 2, z: undefined } }]
        })
      ),
    {
      name: "TypeError",
      message: POSITION_TWO
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          observer: { x: 0, y: 0, z: 0 },
          entities: [entity("entity-a", 1, 0)]
        })
      ),
    {
      name: "TypeError",
      message: POSITION_THREE
    }
  );
  for (const z of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, "0", true]) {
    assert.throws(
      () =>
        selectUpdates(
          valid({
            observer: { x: 0, y: 0, z: 0 },
            entities: [{ id: "entity-a", position: { x: 1, y: 0, z } }]
          })
        ),
      {
        name: "RangeError",
        message: POSITION_Z
      }
    );
  }
  const inherited = Object.create({ x: 1, y: 2 });
  assert.throws(
    () => selectUpdates(valid({ entities: [{ id: "entity-a", position: inherited }] })),
    {
      name: "RangeError",
      message: POSITION_X
    }
  );
});

test("tiers are a non-empty array of increasing distances and integer intervals", () => {
  for (const tiers of [undefined, null, { distance: 10, interval: 1 }, [], "10", 1]) {
    assert.throws(() => selectUpdates(valid({ tiers })), {
      name: "TypeError",
      message: TIERS
    });
  }
  for (const entry of [null, [], "near", 1, true, undefined]) {
    assert.throws(() => selectUpdates(valid({ tiers: [entry] })), {
      name: "TypeError",
      message: TIER
    });
  }
  const tierHole = [tier(10, 1)];
  tierHole.length = 2;
  assert.throws(() => selectUpdates(valid({ tiers: tierHole })), {
    name: "TypeError",
    message: TIER
  });
  for (const distance of [
    undefined,
    null,
    -1,
    -0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "10",
    true,
    false
  ]) {
    assert.throws(() => selectUpdates(valid({ tiers: [{ distance, interval: 1 }] })), {
      name: "RangeError",
      message: DISTANCE
    });
  }
  assert.throws(
    () =>
      selectUpdates(
        valid({
          tiers: [{ distance: 10, interval: 1 }, { interval: 1 }]
        })
      ),
    {
      name: "RangeError",
      message: DISTANCE
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          tiers: [
            { distance: 10, interval: 1 },
            { distance: 5, interval: "nope" }
          ]
        })
      ),
    {
      name: "RangeError",
      message: ORDER
    }
  );
  assert.throws(() => selectUpdates(valid({ tiers: [tier(10, 1), tier(10, 2)] })), {
    name: "RangeError",
    message: ORDER
  });
  assert.throws(() => selectUpdates(valid({ tiers: [tier(-0, 1), tier(0, 1)] })), {
    name: "RangeError",
    message: ORDER
  });
  assert.throws(() => selectUpdates(valid({ tiers: [tier(20, 1), tier(10, 1)] })), {
    name: "RangeError",
    message: ORDER
  });
  for (const interval of [
    undefined,
    null,
    0,
    -1,
    -0,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "1",
    true,
    false,
    Number.MAX_SAFE_INTEGER + 1
  ]) {
    assert.throws(() => selectUpdates(valid({ tiers: [{ distance: 10, interval }] })), {
      name: "RangeError",
      message: INTERVAL
    });
  }
  assert.throws(
    () =>
      selectUpdates(
        valid({
          tiers: [tier(10, 1), { distance: 20, interval: 1.5 }]
        })
      ),
    {
      name: "RangeError",
      message: INTERVAL
    }
  );
  const fractional = selectUpdates(
    valid({
      tiers: [{ distance: 10.5, interval: 1, name: "near" }],
      entities: [entity("entity-a", 0, 10), entity("entity-b", 0, 11)]
    })
  );
  assert.equal(fractional.tiers[0].distance, 10.5);
  assert.equal(fractional.tiers[0].interval, 1);
  assert.deepEqual(fractional.due, ["entity-a"]);
  assert.deepEqual(fractional.culled, ["entity-b"]);
  const wide = selectUpdates(
    valid({
      tiers: [{ distance: 10, interval: Number.MAX_SAFE_INTEGER }]
    })
  );
  assert.equal(wide.tiers[0].interval, Number.MAX_SAFE_INTEGER);
});

test("tick is a required safe integer and max is an optional safe integer", () => {
  for (const tick of [
    undefined,
    null,
    -1,
    -0.1,
    0.5,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "0",
    true,
    false,
    [],
    {},
    Number.MAX_SAFE_INTEGER + 1
  ]) {
    assert.throws(() => selectUpdates(valid({ tick })), {
      name: "RangeError",
      message: TICK
    });
  }
  const omitted = { ...valid() };
  delete omitted.tick;
  assert.throws(() => selectUpdates(omitted), {
    name: "RangeError",
    message: TICK
  });
  const inheritedTick = Object.create({ tick: 0 });
  inheritedTick.observer = { x: 0, y: 0 };
  inheritedTick.entities = [entity("entity-a", 1, 0)];
  inheritedTick.tiers = [tier(10, 1)];
  assert.throws(() => selectUpdates(inheritedTick), {
    name: "RangeError",
    message: TICK
  });
  for (const max of [
    null,
    -1,
    -0.1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "1",
    true,
    false,
    [],
    {},
    Number.MAX_SAFE_INTEGER + 1
  ]) {
    assert.throws(() => selectUpdates(valid({ max })), {
      name: "RangeError",
      message: MAX
    });
  }
  assert.equal(selectUpdates(valid()).max, null);
  assert.equal(selectUpdates(valid({ max: undefined })).max, null);
  const negativeZero = selectUpdates(
    valid({
      tick: -0,
      max: -0,
      tiers: [tier(-0, 1)],
      entities: [entity("entity-a", -0, -0)],
      observer: { x: -0, y: -0 }
    })
  );
  assert.equal(negativeZero.tick, 0);
  assert.equal(Object.is(negativeZero.tick, -0), false);
  assert.equal(negativeZero.max, 0);
  assert.equal(Object.is(negativeZero.max, -0), false);
  assert.equal(negativeZero.tiers[0].distance, 0);
  assert.equal(Object.is(negativeZero.tiers[0].distance, -0), false);
  assert.deepEqual(negativeZero.due, []);
  assert.deepEqual(negativeZero.deferred, ["entity-a"]);
  const whole = selectUpdates(valid({ tick: 1.0, tiers: [{ distance: 10, interval: 1.0 }] }));
  assert.equal(whole.tick, 1);
  assert.equal(whole.tiers[0].interval, 1);
  const top = selectUpdates(valid({ tick: Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }));
  assert.equal(top.tick, Number.MAX_SAFE_INTEGER);
  assert.equal(top.max, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(top.due, ["entity-a"]);
  assert.deepEqual(top.deferred, []);
});

test("unknown fields are ignored and a frozen input is accepted", () => {
  const samples = Object.freeze({ x: 3, y: 4, label: "point" });
  const entry = Object.freeze({
    id: "entity-a",
    position: samples,
    health: 3
  });
  const band = Object.freeze({ distance: 10, interval: 1, name: "near" });
  const options = Object.freeze({
    observer: Object.freeze({ x: 0, y: 0, label: "origin" }),
    entities: Object.freeze([entry]),
    tiers: Object.freeze([band]),
    tick: 0,
    note: "ignored"
  });
  const result = selectUpdates(options);
  assert.deepEqual(result.due, ["entity-a"]);
  assert.equal(Object.isFrozen(options), true);
  assert.deepEqual(samples, { x: 3, y: 4, label: "point" });
  const bad = Object.freeze([
    Object.freeze({
      id: "entity-a",
      position: Object.freeze({ x: 1, y: Number.NaN })
    })
  ]);
  assert.throws(() => selectUpdates(valid({ entities: bad })), {
    name: "RangeError",
    message: POSITION_Y
  });
  assert.equal(bad[0].position.y, Number.NaN);
});

test("a non-finite distance is reported after validation and in entity order", () => {
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [
            entity("entity-a", Number.MAX_VALUE, Number.MAX_VALUE),
            { id: "entity-b", position: { x: Number.NaN, y: 0 } }
          ]
        })
      ),
    {
      name: "RangeError",
      message: POSITION_X
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          entities: [
            entity("entity-a", 1, 0),
            entity("entity-b", Number.MAX_VALUE, Number.MAX_VALUE)
          ]
        })
      ),
    {
      name: "RangeError",
      message: LENGTH
    }
  );
  assert.throws(
    () =>
      selectUpdates(
        valid({
          observer: { x: 0, y: 0, z: 0 },
          entities: [
            {
              id: "entity-a",
              position: { x: Number.MAX_VALUE, y: Number.MAX_VALUE, z: 0 }
            }
          ],
          tiers: [tier(Number.MAX_VALUE, 1)]
        })
      ),
    {
      name: "RangeError",
      message: LENGTH
    }
  );
  const huge = selectUpdates(
    valid({
      entities: [entity("entity-a", 1e200, 0)],
      tiers: [tier(10, 1)]
    })
  );
  assert.deepEqual(huge.culled, ["entity-a"]);
  const kept = selectUpdates(
    valid({
      entities: [entity("entity-a", 1e200, 0)],
      tiers: [tier(1e308, 1)]
    })
  );
  assert.deepEqual(kept.due, ["entity-a"]);
});
