// Простий паралельний раннер для розробки (без зовнішніх залежностей):
// одночасно піднімає бекенд (node server.js) і Vite, з кольоровими префіксами,
// і коректно гасить обидва процеси по Ctrl+C або якщо один із них впав.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';
const viteBin = path.join(__dirname, 'node_modules', '.bin', isWin ? 'vite.cmd' : 'vite');

const targets = [
  { name: 'server', color: '\x1b[34m', cmd: process.execPath, args: ['server.js'] },
  { name: 'web', color: '\x1b[32m', cmd: viteBin, args: [] },
];

const children = [];
let shuttingDown = false;

const tag = (name, color, line) => `${color}[${name}]\x1b[0m ${line}`;

function pipe(name, color, stream, out) {
  stream.setEncoding('utf8');
  let buf = '';
  stream.on('data', (chunk) => {
    buf += chunk;
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const l of lines) out.write(tag(name, color, l) + '\n');
  });
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) c.kill('SIGTERM');
  setTimeout(() => process.exit(0), 300);
}

for (const t of targets) {
  const child = spawn(t.cmd, t.args, {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWin,
  });
  children.push(child);
  pipe(t.name, t.color, child.stdout, process.stdout);
  pipe(t.name, t.color, child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.log(tag(t.name, t.color, `завершився (код ${code}) — зупиняю решту…`));
      shutdown();
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
