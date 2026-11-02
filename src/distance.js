import { normalizeZero } from "./shape.js";

const DISTANCE_MESSAGE = "distance must be finite";

export function measure(origin, point) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  let value = Math.hypot(dx, dy);
  if (Object.hasOwn(origin, "z")) {
    value = Math.hypot(dx, dy, point.z - origin.z);
  }
  if (!Number.isFinite(value)) {
    throw new RangeError(DISTANCE_MESSAGE);
  }
  return normalizeZero(value);
}
