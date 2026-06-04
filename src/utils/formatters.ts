// ─────────────────────────────────────────────────────────────────────────────
// Formatters — date, time, numbers for the UI
// ─────────────────────────────────────────────────────────────────────────────

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const diff = now - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 1)   return 'только что';
  if (mins < 60)  return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  return `${days} д. назад`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}
