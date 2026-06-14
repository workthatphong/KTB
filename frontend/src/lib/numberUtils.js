export function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function percentile(values, ratio) {
  const prepared = (Array.isArray(values) ? values : [])
    .map((value) => safeNumber(value))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  if (prepared.length === 0) return 0;
  const boundedRatio = Math.max(0, Math.min(1, safeNumber(ratio)));
  const index = Math.ceil(boundedRatio * prepared.length) - 1;
  return prepared[Math.max(0, Math.min(prepared.length - 1, index))];
}
