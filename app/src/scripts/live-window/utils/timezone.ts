/**
 * Shifts a UTC millisecond timestamp so that, when passed to `new Date()`,
 * the resulting hours/minutes match the given IANA timezone's wall clock.
 *
 * This is used so that all phase/clock code (which calls
 * `new Date(now).getHours()`) works correctly for remote timezones
 * without modifying every consumer.
 */
export function shiftTimestampToTimezone(utcMs: number, timezone: string): number {
  const date = new Date(utcMs);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Missing date part: ${type}`);
    }
    return parseInt(part.value, 10);
  };

  const hour = get("hour");
  const shifted = new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    hour === 24 ? 0 : hour,
    get("minute"),
    get("second"),
  );

  return shifted.getTime();
}

/**
 * Returns a Date.now()-like timestamp that, when passed to `new Date()`,
 * produces local-looking hours/minutes matching the given IANA timezone.
 */
export function getTimezoneAdjustedNow(timezone: string): number {
  return shiftTimestampToTimezone(Date.now(), timezone);
}
