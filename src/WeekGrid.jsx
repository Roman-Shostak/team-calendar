import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DAYS,
  DAY_START_MIN,
  DAY_END_MIN,
  STEP_MIN,
  ROW_H,
  ROWS,
  dayDate,
  dateFromSlot,
  sameDay,
  minutesOfDay,
  fmtTime,
  fmtWeekday,
  fmtDay,
} from './lib/time.js';
import { layoutDay } from './lib/layout.js';
import { colorFor } from './lib/color.js';

const rowFromY = (y, top) =>
  Math.max(0, Math.min(ROWS - 1, Math.floor((y - top) / ROW_H)));

export default function WeekGrid({ weekStart, slots, onCreate, onDelete, myName }) {
  const dragRef = useRef(null); // { dayIndex, colTop, startRow, curRow } під час перетягування
  const [dragView, setDragView] = useState(null); // { dayIndex, lo, hi } для підсвітки
  const [pending, setPending] = useState(null); // { dayIndex, startMin, endMin } — очікує ім'я
  const [name, setName] = useState(myName);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  // Підставляємо запам'ятоване ім'я щоразу, коли відкривається модалка нового слота
  // (а не лише при зміні myName) — інакше після редагування+скасування лишається покинутий текст.
  useEffect(() => {
    if (pending) setName(myName);
  }, [pending, myName]);

  // Глобальні слухачі перетягування — стабільні, керуються через dragRef.
  useEffect(() => {
    const move = (e) => {
      const dr = dragRef.current;
      if (!dr) return;
      // Перераховуємо верх колонки на кожен рух: clientY залежить від прокрутки сторінки,
      // тож заморожений top давав би зсув, якби сторінку прокрутили під час перетягування.
      const top = dr.colEl.getBoundingClientRect().top;
      dr.curRow = rowFromY(e.clientY, top);
      setDragView({
        dayIndex: dr.dayIndex,
        lo: Math.min(dr.startRow, dr.curRow),
        hi: Math.max(dr.startRow, dr.curRow),
      });
    };
    const up = () => {
      const dr = dragRef.current;
      if (!dr) return;
      const lo = Math.min(dr.startRow, dr.curRow);
      const hi = Math.max(dr.startRow, dr.curRow);
      dragRef.current = null;
      setDragView(null);
      setFormError(null);
      setPending({
        dayIndex: dr.dayIndex,
        startMin: DAY_START_MIN + lo * STEP_MIN,
        endMin: DAY_START_MIN + (hi + 1) * STEP_MIN,
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const onColMouseDown = (dayIndex) => (e) => {
    if (e.button !== 0) return; // лише ліва кнопка
    e.preventDefault();
    setPending(null);
    const colEl = e.currentTarget;
    const row = rowFromY(e.clientY, colEl.getBoundingClientRect().top);
    dragRef.current = { dayIndex, colEl, startRow: row, curRow: row };
    setDragView({ dayIndex, lo: row, hi: row });
  };

  // Слоти, розкладені по днях і колонках.
  const dayLayouts = useMemo(() => {
    const byDay = DAYS.map(() => []);
    for (const s of slots) {
      const start = new Date(s.start);
      const end = new Date(s.end);
      for (const di of DAYS) {
        if (!sameDay(start, dayDate(weekStart, di))) continue;
        const rawStart = minutesOfDay(start);
        // Кінець іншого дня (минув опівніч) — тягнемо до кінця видимої сітки.
        let rawEnd = sameDay(end, start) ? minutesOfDay(end) : DAY_END_MIN;
        if (rawEnd <= rawStart) rawEnd = DAY_END_MIN;
        // Спершу відкидаємо слоти, що зовсім не перетинають видиме вікно
        // (напр., вечірній слот, що в чужому часовому поясі випадає поза 08:00–22:00),
        // і лише потім обрізаємо краї — так висота завжди додатна.
        if (rawEnd <= DAY_START_MIN || rawStart >= DAY_END_MIN) break;
        const startMin = Math.max(DAY_START_MIN, rawStart);
        const endMin = Math.min(DAY_END_MIN, rawEnd);
        byDay[di].push({ id: s.id, name: s.name, startMin, endMin });
        break;
      }
    }
    return byDay.map((evs) => layoutDay(evs));
  }, [slots, weekStart]);

  const confirm = async () => {
    if (!pending) return;
    const nm = name.trim();
    if (!nm) {
      setFormError("Впишіть ім'я");
      return;
    }
    const start = dateFromSlot(weekStart, pending.dayIndex, pending.startMin);
    const end = dateFromSlot(weekStart, pending.dayIndex, pending.endMin);
    setBusy(true);
    setFormError(null);
    try {
      await onCreate({ name: nm, start: start.toISOString(), end: end.toISOString() });
      setPending(null);
    } catch (err) {
      setFormError(err.message || 'Помилка створення');
    } finally {
      setBusy(false);
    }
  };

  const bodyHeight = ROWS * ROW_H;
  const today = new Date();

  return (
    <div
      className={'calendar' + (dragView ? ' dragging' : '')}
      style={{ '--row-h': `${ROW_H}px` }}
    >
      {/* Шапка з днями */}
      <div className="cal-head">
        <div className="gutter-head" />
        {DAYS.map((di) => {
          const d = dayDate(weekStart, di);
          return (
            <div key={di} className={'day-head' + (sameDay(d, today) ? ' is-today' : '')}>
              <span className="wd">{fmtWeekday(d)}</span>
              <span className="dn">{fmtDay(d)}</span>
            </div>
          );
        })}
      </div>

      {/* Тіло сітки */}
      <div className="cal-body">
        <div className="gutter" style={{ height: bodyHeight }}>
          {Array.from({ length: ROWS + 1 }).map((_, r) => {
            const min = DAY_START_MIN + r * STEP_MIN;
            return min % 60 === 0 ? (
              <div key={r} className="hour-label" style={{ top: r * ROW_H }}>
                {fmtTime(min)}
              </div>
            ) : null;
          })}
        </div>

        {DAYS.map((di) => {
          const d = dayDate(weekStart, di);
          return (
            <div
              key={di}
              className={'day-col' + (sameDay(d, today) ? ' is-today' : '')}
              style={{ height: bodyHeight }}
              onMouseDown={onColMouseDown(di)}
            >
              {/* Підсвітка під час перетягування */}
              {dragView && dragView.dayIndex === di && (
                <div
                  className="sel"
                  style={{
                    top: dragView.lo * ROW_H,
                    height: (dragView.hi - dragView.lo + 1) * ROW_H,
                  }}
                >
                  {fmtTime(DAY_START_MIN + dragView.lo * STEP_MIN)}–
                  {fmtTime(DAY_START_MIN + (dragView.hi + 1) * STEP_MIN)}
                </div>
              )}

              {/* Очікує введення імені */}
              {pending && pending.dayIndex === di && (
                <div
                  className="sel pending"
                  style={{
                    top: ((pending.startMin - DAY_START_MIN) / STEP_MIN) * ROW_H,
                    height: ((pending.endMin - pending.startMin) / STEP_MIN) * ROW_H,
                  }}
                />
              )}

              {/* Події */}
              {dayLayouts[di].map((ev) => {
                const c = colorFor(ev.name);
                const widthPct = 100 / ev.cols;
                return (
                  <div
                    key={ev.id}
                    className="event"
                    onMouseDown={(e) => e.stopPropagation()} // не починати нове перетягування поверх події
                    style={{
                      top: ((ev.startMin - DAY_START_MIN) / STEP_MIN) * ROW_H,
                      height: Math.max(((ev.endMin - ev.startMin) / STEP_MIN) * ROW_H, 16),
                      left: `calc(${ev.col * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      background: c.bg,
                      borderColor: c.border,
                      color: c.text,
                    }}
                  >
                    <span className="ev-bar" style={{ background: c.bar }} />
                    <button
                      className="ev-del"
                      title="Видалити"
                      onClick={() => onDelete(ev.id)}
                    >
                      ×
                    </button>
                    <div className="ev-name">{ev.name}</div>
                    <div className="ev-time">
                      {fmtTime(ev.startMin)}–{fmtTime(ev.endMin)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Модалка введення імені */}
      {pending && (
        <div
          className="modal-overlay"
          onMouseDown={() => !busy && setPending(null)}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Новий проміжок</h3>
            <div className="modal-when">
              {fmtWeekday(dayDate(weekStart, pending.dayIndex))},{' '}
              {fmtDay(dayDate(weekStart, pending.dayIndex))} ·{' '}
              {fmtTime(pending.startMin)}–{fmtTime(pending.endMin)}
            </div>
            <label className="field">
              Ваше ім'я
              <input
                autoFocus
                value={name}
                maxLength={60}
                placeholder="Напр., Аня"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirm();
                  if (e.key === 'Escape') setPending(null);
                }}
              />
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button className="ghost" onClick={() => setPending(null)} disabled={busy}>
                Скасувати
              </button>
              <button
                className="primary"
                onClick={confirm}
                disabled={busy || !name.trim()}
              >
                {busy ? 'Додаю…' : 'Додати'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
