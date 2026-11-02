const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function fnv1a32(id) {
  let hash = FNV_OFFSET;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export function expectDue(tick, id, interval) {
  const phase = BigInt(fnv1a32(id)) % BigInt(interval);
  return (BigInt(tick) + phase) % BigInt(interval) === 0n;
}
