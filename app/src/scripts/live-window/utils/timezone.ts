/**
 * Returns a Date.now()-like timestamp that, when passed to `new Date()`,
 * produces local-looking hours/minutes matching the given IANA timezone.
 *
 * This is used so that all existing phase/clock code (which calls
 * `new Date(now).getHours()`) works correctly for remote timezones
 * without modifying every consumer.
 */
export function getTimezoneAdjustedNow(timezone: string): number {
  const now = new Date();

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

  const parts = formatter.formatToParts(now);
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
