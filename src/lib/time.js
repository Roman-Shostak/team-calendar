// Налаштування видимого діапазону сітки (легко змінити за потреби).
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 22;
export const STEP_MIN = 30; // крок прив'язки під час перетягування
export const ROW_H = 28; // висота одного кроку в пікселях

export const DAY_START_MIN = DAY_START_HOUR * 60;
export const DAY_END_MIN = DAY_END_HOUR * 60;
export const ROWS = (DAY_END_MIN - DAY_START_MIN) / STEP_MIN;

export const DAYS = [0, 1, 2, 3, 4, 5, 6];

// Понеділок 00:00 того тижня, до якого належить дата.
export function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Пн = 0 … Нд = 6
  d.setDate(d.getDate() - dow);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function dayDate(weekStart, dayIndex) {
  return addDays(weekStart, dayIndex);
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Хвилини від опівночі -> конкретна дата того дня.
export function dateFromSlot(weekStart, dayIndex, minutes) {
  const d = dayDate(weekStart, dayIndex);
  d.setHours(0, minutes, 0, 0); // Date нормалізує хвилини у години
  return d;
}

export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function fmtTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const wdFmt = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' });
const dayFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });

export function fmtWeekday(date) {
  return wdFmt.format(date);
}
export function fmtDay(date) {
  return dayFmt.format(date);
}
export function fmtRange(weekStart) {
  return `${longFmt.format(weekStart)} – ${longFmt.format(addDays(weekStart, 6))}`;
}
