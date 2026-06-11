import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── База даних (вбудована SQLite, без нативних залежностей) ──────────────────
const db = new DatabaseSync(path.join(__dirname, 'data.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS slots (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    start      TEXT NOT NULL,
    end        TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const listStmt = db.prepare('SELECT id, name, start, end FROM slots ORDER BY start');
const insertStmt = db.prepare(
  'INSERT INTO slots (id, name, start, end, created_at) VALUES (?, ?, ?, ?, ?)'
);
const deleteStmt = db.prepare('DELETE FROM slots WHERE id = ?');

const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // запобіжник від абсурдно довгих слотів

// ── HTTP ────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/api/slots', (req, res) => {
  res.json(listStmt.all());
});

app.post('/api/slots', (req, res) => {
  const { name, start, end } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: "Ім'я обовʼязкове" });
  }
  if (typeof start !== 'string' || typeof end !== 'string') {
    return res.status(400).json({ error: 'Невірний формат часу' });
  }
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return res.status(400).json({ error: 'Невірний формат часу' });
  }
  if (e <= s) {
    return res.status(400).json({ error: 'Кінець має бути пізніше за початок' });
  }
  if (e - s > MAX_DURATION_MS) {
    return res.status(400).json({ error: 'Проміжок задовгий' });
  }

  const row = {
    id: randomUUID(),
    name: name.trim().slice(0, 60),
    start: s.toISOString(),
    end: e.toISOString(),
    created_at: new Date().toISOString(),
  };
  insertStmt.run(row.id, row.name, row.start, row.end, row.created_at);
  res.status(201).json({ id: row.id, name: row.name, start: row.start, end: row.end });
});

app.delete('/api/slots/:id', (req, res) => {
  const info = deleteStmt.run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Слот не знайдено' });
  res.status(204).end();
});

// Єдиний JSON-контракт помилок (зокрема для некоректного тіла запиту).
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Невірний JSON у запиті' });
  }
  console.error(err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

// ── Статика зібраного фронтенду (у проді) ───────────────────────────────────
const dist = path.join(__dirname, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Командний календар: http://localhost:${PORT}`);
  if (!fs.existsSync(dist)) {
    console.log('ℹ️  dist/ не зібрано — у режимі розробки відкрий http://localhost:5173 (vite).');
  }
});
