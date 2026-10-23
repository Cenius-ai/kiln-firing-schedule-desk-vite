/** Date helpers. The API speaks naive studio-local datetimes ("2025-06-14T09:00:00"). */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function monthKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function formatTime(date) {
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDayMonth(date) {
  return { day: String(date.getDate()).padStart(2, '0'), month: MONTHS_SHORT[date.getMonth()] };
}

export function formatWeekdayDate(date) {
  return `${WEEKDAYS[(date.getDay() + 6) % 7]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatFullDate(date) {
  return `${WEEKDAYS[(date.getDay() + 6) % 7]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMonthTitle(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMonthDayTime(date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}, ${formatTime(date)}`;
}

export function toDateTimeInputValue(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function toDateInputValue(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Six-week month grid starting on Monday. */
export function buildMonthCells(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    cells.push({ date, key: dayKey(date), inMonth: date.getMonth() === cursor.getMonth() });
  }
  return cells;
}

export const WEEKDAY_LABELS = WEEKDAYS;

/** Humanised relative day, clamped so a same-day or past value never reads oddly. */
export function relativeDays(value) {
  const date = parseDate(value);
  if (!date) return '';
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((today - target) / 86400000);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return 'last week';
  return `on ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function relativeUpcoming(value) {
  const date = parseDate(value);
  if (!date) return '';
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target - today) / 86400000);
  if (diff < 0) return 'in progress';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 7) return `in ${diff} days`;
  return `in ${Math.round(diff / 7)} week${Math.round(diff / 7) === 1 ? '' : 's'}`;
}

export { MONTHS, MONTHS_SHORT };
