// All times are in IST (UTC+5:30).
// Shift: 6 PM IST to 3:30 AM IST (next day).
// Punch window opens: 5:45 PM IST.
// Attendance day resets: 4:00 AM IST.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5h 30m in milliseconds

// Returns IST date components from the current UTC timestamp.
function getNowIST(): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const d = new Date(Date.now() + IST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

/**
 * Returns the UTC Date of the start of the current attendance "shift day".
 * A shift day starts at 4:00 AM IST.
 * If current IST time is before 4:00 AM, we are still in the previous
 * calendar day's shift (e.g. 2:00 AM IST on May 23 → shift day = May 22).
 */
export function getShiftDayStart(): Date {
  const ist = getNowIST();

  // If before 4 AM IST, the shift belongs to the previous IST calendar day
  const shiftISTDay =
    ist.hours < 4
      ? new Date(Date.UTC(ist.year, ist.month, ist.day - 1))
      : new Date(Date.UTC(ist.year, ist.month, ist.day));

  // 4:00 AM IST = 4:00 AM − 5h30m = 22:30 UTC of the previous UTC day
  return new Date(
    Date.UTC(
      shiftISTDay.getUTCFullYear(),
      shiftISTDay.getUTCMonth(),
      shiftISTDay.getUTCDate(),
      4,
      0,
      0,
    ) - IST_OFFSET_MS,
  );
}

/**
 * Returns true if the current IST time is within the punch window:
 * 5:45 PM IST (17:45) through 3:30 AM IST (03:30), crossing midnight.
 */
export function isWithinPunchWindow(): boolean {
  const ist = getNowIST();
  const totalMinutes = ist.hours * 60 + ist.minutes;
  const WINDOW_OPEN = 17 * 60 + 45; // 5:45 PM
  const WINDOW_CLOSE = 3 * 60 + 30; // 3:30 AM
  return totalMinutes >= WINDOW_OPEN || totalMinutes <= WINDOW_CLOSE;
}

/**
 * Returns a human-readable message when punch is not available.
 * Returns "" if currently within the punch window.
 */
export function getPunchWindowMessage(): string {
  if (isWithinPunchWindow()) return "";

  const ist = getNowIST();
  const totalMinutes = ist.hours * 60 + ist.minutes;
  const WINDOW_OPEN = 17 * 60 + 45; // 1065 minutes

  // We are between 3:30 AM and 5:45 PM — window is closed
  const minutesUntilOpen = WINDOW_OPEN - totalMinutes;

  if (minutesUntilOpen <= 0) return "Punch opens at 5:45 PM";

  const hours = Math.floor(minutesUntilOpen / 60);
  const mins = minutesUntilOpen % 60;

  if (hours === 0) return `Punch opens in ${mins}m (5:45 PM)`;
  if (mins === 0) return `Punch opens in ${hours}h (5:45 PM)`;
  return `Punch opens in ${hours}h ${mins}m (5:45 PM)`;
}
