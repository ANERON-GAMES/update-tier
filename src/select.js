import { measure } from "./distance.js";
import { isDue, phaseOffset } from "./phase.js";
import { readOptions } from "./read.js";

export function selectUpdates(options) {
  const input = readOptions(options);
  const rows = classify(input);
  const dueRows = [];
  const waitingRows = [];
  const culledRows = [];
  for (const row of rows) {
    if (row.tier < 0) {
      culledRows.push(row);
      continue;
    }
    if (row.due) {
      dueRows.push(row);
    } else {
      waitingRows.push(row);
    }
  }
  dueRows.sort(compareTier);
  waitingRows.sort(compareTier);
  culledRows.sort(compareDistance);
  const split = splitDue(dueRows, input.max);
  return freezeResult({
    tick: input.tick,
    max: input.max,
    due: idsOf(split.selected),
    deferred: idsOf(split.deferred),
    waiting: idsOf(waitingRows),
    culled: idsOf(culledRows),
    tiers: countTiers(input.tiers, rows, split.selected, split.deferred, waitingRows)
  });
}

function classify(input) {
  const rows = [];
  for (const entity of input.entities) {
    const distance = measure(input.observer, entity.position);
    const tier = findTier(distance, input.tiers);
    let due = false;
    if (tier >= 0) {
      const interval = input.tiers[tier].interval;
      due = isDue(input.tick, phaseOffset(entity.id, interval), interval);
    }
    rows.push({ id: entity.id, distance, tier, due });
  }
  return rows;
}

function findTier(distance, tiers) {
  for (let index = 0; index < tiers.length; index += 1) {
    if (distance <= tiers[index].distance) {
      return index;
    }
  }
  return -1;
}

function splitDue(rows, max) {
  const limit = max === null ? rows.length : max;
  const selected = [];
  const deferred = [];
  for (const row of rows) {
    if (selected.length < limit) {
      selected.push(row);
    } else {
      deferred.push(row);
    }
  }
  return { selected, deferred };
}

function countTiers(tiers, rows, selected, deferred, waiting) {
  const counts = [];
  for (const tier of tiers) {
    counts.push({
      distance: tier.distance,
      interval: tier.interval,
      count: 0,
      due: 0,
      deferred: 0,
      waiting: 0
    });
  }
  for (const row of rows) {
    if (row.tier >= 0) {
      counts[row.tier].count += 1;
    }
  }
  addCount(counts, selected, "due");
  addCount(counts, deferred, "deferred");
  addCount(counts, waiting, "waiting");
  return counts;
}

function addCount(counts, rows, key) {
  for (const row of rows) {
    counts[row.tier][key] += 1;
  }
}

function idsOf(rows) {
  const ids = [];
  for (const row of rows) {
    ids.push(row.id);
  }
  return ids;
}

function compareTier(left, right) {
  if (left.tier < right.tier) {
    return -1;
  }
  if (left.tier > right.tier) {
    return 1;
  }
  return compareDistance(left, right);
}

function compareDistance(left, right) {
  if (left.distance < right.distance) {
    return -1;
  }
  if (left.distance > right.distance) {
    return 1;
  }
  return compareId(left.id, right.id);
}

function compareId(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function freezeResult(result) {
  Object.freeze(result.due);
  Object.freeze(result.deferred);
  Object.freeze(result.waiting);
  Object.freeze(result.culled);
  for (const entry of result.tiers) {
    Object.freeze(entry);
  }
  Object.freeze(result.tiers);
  return Object.freeze(result);
}
