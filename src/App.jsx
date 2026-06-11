import React, { useCallback, useEffect, useRef, useState } from 'react';
import WeekGrid from './WeekGrid.jsx';
import { fetchSlots, createSlot, deleteSlot } from './api.js';
import { startOfWeek, addDays, fmtRange } from './lib/time.js';

export default function App() {
  const [slots, setSlots] = useState([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [error, setError] = useState(null);
  const [myName, setMyName] = useState(() => localStorage.getItem('tc_name') || '');

  // Захист від гонок: застосовуємо лише найсвіжішу відповідь, а полінг не чіпає стан під час мутації.
  const reqIdRef = useRef(0);
  const mutatingRef = useRef(false);

  const load = useCallback(async () => {
    const id = ++reqIdRef.current;
    try {
      const data = await fetchSlots();
      if (id === reqIdRef.current) {
        setSlots(data);
        setError(null);
      }
    } catch {
      if (id === reqIdRef.current) setError('Не вдалося завантажити слоти');
    }
  }, []);

  // Початкове завантаження + опитування сервера, щоб бачити чужі слоти майже в реальному часі.
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!mutatingRef.current) load();
    }, 5000);
    return () => clearInterval(id);
  }, [load]);

  const handleCreate = useCallback(
    async (slot) => {
      mutatingRef.current = true;
      try {
        await createSlot(slot); // помилку обробляє WeekGrid (показує в модалці)
        localStorage.setItem('tc_name', slot.name);
        setMyName(slot.name);
        await load();
      } finally {
        mutatingRef.current = false;
      }
    },
    [load]
  );

  const handleDelete = useCallback(
    async (id) => {
      mutatingRef.current = true;
      try {
        await deleteSlot(id);
        await load();
      } catch {
        setError('Не вдалося видалити слот');
      } finally {
        mutatingRef.current = false;
      }
    },
    [load]
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">📅</span> Командний календар
        </div>
        <div className="weeknav">
          <button
            className="nav"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="Попередній тиждень"
          >
            ‹
          </button>
          <button className="today" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Сьогодні
          </button>
          <button
            className="nav"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="Наступний тиждень"
          >
            ›
          </button>
          <span className="range">{fmtRange(weekStart)}</span>
        </div>
      </header>

      {error && (
        <div className="banner error" onClick={() => setError(null)}>
          {error} <span className="dismiss">×</span>
        </div>
      )}

      <WeekGrid
        weekStart={weekStart}
        slots={slots}
        onCreate={handleCreate}
        onDelete={handleDelete}
        myName={myName}
      />

      <footer className="hint">
        Клацни або потягни мишею по сітці, щоб обрати проміжок, і впиши ім'я. Проміжки можуть
        накладатися.
      </footer>
    </div>
  );
}
