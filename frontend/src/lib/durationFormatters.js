export function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (safe === 0) return '0s';

  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  const parts = [];
  let remaining = safe;

  if (remaining >= YEAR) {
    const years = Math.floor(remaining / YEAR);
    parts.push(`${years}y`);
    remaining %= YEAR;
  }
  if (remaining >= MONTH) {
    const months = Math.floor(remaining / MONTH);
    parts.push(`${months}mo`);
    remaining %= MONTH;
  }
  if (remaining >= DAY) {
    const days = Math.floor(remaining / DAY);
    parts.push(`${days}d`);
    remaining %= DAY;
  }
  if (remaining >= HOUR) {
    const hours = Math.floor(remaining / HOUR);
    parts.push(`${hours}h`);
    remaining %= HOUR;
  }
  if (remaining >= MINUTE) {
    const minutes = Math.floor(remaining / MINUTE);
    parts.push(`${minutes}m`);
    remaining %= MINUTE;
  }
  if (remaining > 0 || parts.length === 0) {
    parts.push(`${remaining}s`);
  }

  // Return up to 2 units for a good balance of detail and readability
  return parts.slice(0, 2).join(' ');
}

export function formatPercent(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}
