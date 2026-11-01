const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function phaseOffset(id, interval) {
  let hash = FNV_OFFSET;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0) % interval;
}

export function isDue(tick, phase, interval) {
  return tick % interval === (interval - phase) % interval;
}
