// Assemble numeric parts explicitly: ICU versions can disagree on punctuation
// and non-breaking spaces in localized dates during server/client hydration.
const limaTimestamp = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatLimaTimestamp(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Sin fecha';
  const parts = Object.fromEntries(
    limaTimestamp.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}`;
}
