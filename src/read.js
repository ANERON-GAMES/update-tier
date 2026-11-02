import { isObject, normalizeZero } from "./shape.js";

const OPTIONS_MESSAGE = "options must be an object";
const OBSERVER_MESSAGE = "observer must be an object";
const OBSERVER_X_MESSAGE = "observer x must be a finite number";
const OBSERVER_Y_MESSAGE = "observer y must be a finite number";
const OBSERVER_Z_MESSAGE = "observer z must be a finite number";
const ENTITIES_MESSAGE = "entities must be an array";
const ENTITY_MESSAGE = "entity must be an object";
const ENTITY_ID_MESSAGE = "entity id must be a non-empty string";
const ENTITY_UNIQUE_MESSAGE = "entity ids must be unique";
const POSITION_MESSAGE = "position must be an object";
const POSITION_X_MESSAGE = "position x must be a finite number";
const POSITION_Y_MESSAGE = "position y must be a finite number";
const POSITION_Z_MESSAGE = "position z must be a finite number";
const POSITION_TWO_MESSAGE = "position must be two-dimensional";
const POSITION_THREE_MESSAGE = "position must be three-dimensional";
const TIERS_MESSAGE = "tiers must be a non-empty array";
const TIER_MESSAGE = "tier must be an object";
const TIER_DISTANCE_MESSAGE = "tier distance must be a finite number greater than or equal to 0";
const TIER_ORDER_MESSAGE = "tier distances must increase";
const TIER_INTERVAL_MESSAGE = "tier interval must be an integer greater than or equal to 1";
const TICK_MESSAGE = "tick must be an integer greater than or equal to 0";
const MAX_MESSAGE = "max must be an integer greater than or equal to 0";

export function readOptions(options) {
  if (!isObject(options)) {
    throw new TypeError(OPTIONS_MESSAGE);
  }
  const observer = readObserver(options);
  const entities = readEntities(options, observer);
  const tiers = readTiers(options);
  const tick = readTick(options);
  const max = readMax(options);
  return { observer, entities, tiers, tick, max };
}

function readObserver(options) {
  if (!Object.hasOwn(options, "observer") || !isObject(options.observer)) {
    throw new TypeError(OBSERVER_MESSAGE);
  }
  const source = options.observer;
  const x = readAxis(source, "x", OBSERVER_X_MESSAGE);
  const y = readAxis(source, "y", OBSERVER_Y_MESSAGE);
  if (!Object.hasOwn(source, "z")) {
    return { x, y };
  }
  return { x, y, z: readAxis(source, "z", OBSERVER_Z_MESSAGE) };
}

function readEntities(options, observer) {
  if (!Object.hasOwn(options, "entities") || !Array.isArray(options.entities)) {
    throw new TypeError(ENTITIES_MESSAGE);
  }
  const three = Object.hasOwn(observer, "z");
  const seen = Object.create(null);
  const entities = [];
  for (const entry of options.entities) {
    entities.push(readEntity(entry, seen, three));
  }
  return entities;
}

function readEntity(entry, seen, three) {
  if (!isObject(entry)) {
    throw new TypeError(ENTITY_MESSAGE);
  }
  if (!Object.hasOwn(entry, "id") || typeof entry.id !== "string" || entry.id.length === 0) {
    throw new TypeError(ENTITY_ID_MESSAGE);
  }
  if (Object.hasOwn(seen, entry.id)) {
    throw new TypeError(ENTITY_UNIQUE_MESSAGE);
  }
  seen[entry.id] = true;
  if (!Object.hasOwn(entry, "position") || !isObject(entry.position)) {
    throw new TypeError(POSITION_MESSAGE);
  }
  return { id: entry.id, position: readPosition(entry.position, three) };
}

function readPosition(position, three) {
  const x = readAxis(position, "x", POSITION_X_MESSAGE);
  const y = readAxis(position, "y", POSITION_Y_MESSAGE);
  const hasZ = Object.hasOwn(position, "z");
  if (!three) {
    if (hasZ) {
      throw new TypeError(POSITION_TWO_MESSAGE);
    }
    return { x, y };
  }
  if (!hasZ) {
    throw new TypeError(POSITION_THREE_MESSAGE);
  }
  return { x, y, z: readAxis(position, "z", POSITION_Z_MESSAGE) };
}

function readTiers(options) {
  if (
    !Object.hasOwn(options, "tiers") ||
    !Array.isArray(options.tiers) ||
    options.tiers.length === 0
  ) {
    throw new TypeError(TIERS_MESSAGE);
  }
  const tiers = [];
  for (const entry of options.tiers) {
    tiers.push(readTier(entry, tiers));
  }
  return tiers;
}

function readTier(entry, tiers) {
  if (!isObject(entry)) {
    throw new TypeError(TIER_MESSAGE);
  }
  const distance = readDistance(entry);
  if (tiers.length > 0 && distance <= tiers[tiers.length - 1].distance) {
    throw new RangeError(TIER_ORDER_MESSAGE);
  }
  const interval = readInterval(entry);
  return { distance, interval };
}

function readDistance(entry) {
  if (
    !Object.hasOwn(entry, "distance") ||
    typeof entry.distance !== "number" ||
    !Number.isFinite(entry.distance) ||
    entry.distance < 0
  ) {
    throw new RangeError(TIER_DISTANCE_MESSAGE);
  }
  return normalizeZero(entry.distance);
}

function readInterval(entry) {
  if (
    !Object.hasOwn(entry, "interval") ||
    typeof entry.interval !== "number" ||
    !Number.isSafeInteger(entry.interval) ||
    entry.interval < 1
  ) {
    throw new RangeError(TIER_INTERVAL_MESSAGE);
  }
  return entry.interval;
}

function readTick(options) {
  if (!Object.hasOwn(options, "tick")) {
    throw new RangeError(TICK_MESSAGE);
  }
  return readWhole(options.tick, TICK_MESSAGE);
}

function readMax(options) {
  if (!Object.hasOwn(options, "max") || options.max === undefined) {
    return null;
  }
  return readWhole(options.max, MAX_MESSAGE);
}

function readWhole(value, message) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(message);
  }
  return normalizeZero(value);
}

function readAxis(point, key, message) {
  const missing = !Object.hasOwn(point, key);
  const value = point[key];
  if (missing || typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(message);
  }
  return normalizeZero(value);
}
