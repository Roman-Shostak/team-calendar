// Розкладка подій одного дня по колонках, що накладаються (як у Google Calendar).
// Вхід: [{ id, name, startMin, endMin, ... }] (хвилини від опівночі).
// Вихід: ті самі об'єкти + { col, cols } — індекс колонки та скільки колонок у кластері.
export function layoutDay(events) {
  const sorted = [...events].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
  );
  const out = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const colEnds = []; // colEnds[c] = час завершення останньої події в колонці c
    const placed = cluster.map((ev) => {
      let c = 0;
      while (c < colEnds.length && colEnds[c] > ev.startMin) c++;
      colEnds[c] = ev.endMin;
      return { ev, col: c };
    });
    const cols = colEnds.length;
    for (const p of placed) out.push({ ...p.ev, col: p.col, cols });
    cluster = [];
  };

  for (const ev of sorted) {
    // Нова подія не перетинає поточний кластер -> закриваємо його.
    if (cluster.length && ev.startMin >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endMin);
  }
  if (cluster.length) flush();
  return out;
}
