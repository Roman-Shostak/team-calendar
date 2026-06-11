const BASE = '/api';

export async function fetchSlots() {
  const res = await fetch(`${BASE}/slots`);
  if (!res.ok) throw new Error('Не вдалося завантажити слоти');
  return res.json();
}

export async function createSlot({ name, start, end }) {
  const res = await fetch(`${BASE}/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, start, end }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не вдалося створити слот');
  }
  return res.json();
}

export async function deleteSlot(id) {
  const res = await fetch(`${BASE}/slots/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error('Не вдалося видалити слот');
}
