export function toDisplayDate(value: string | number | Date | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

export function toExcelDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
}

export function formatTimeTick(value: string | number | Date | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTickHeader(value: string | number | Date | null | undefined): { dateLabel: string; timeLabel: string } {
  if (!value) return { dateLabel: '-', timeLabel: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { dateLabel: String(value), timeLabel: '' };
  return {
    dateLabel: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    timeLabel: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function isSameCalendarDay(aTs: number, bTs: number): boolean {
  const a = new Date(aTs);
  const b = new Date(bTs);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
