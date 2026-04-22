import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'balkonek.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed admin user if no users exist
  const count = database.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (count.c === 0) {
    const hashed = bcrypt.hashSync('Admin@2024!', 12);
    database.prepare(
      `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`
    ).run('admin', 'admin@balkonek.eu', hashed, 'admin');
  }
}

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
  active: number;
  created_at: string;
}

export function findUserByUsername(username: string): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
}

export function findUserById(id: number): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getAllUsers(): Omit<User, 'password'>[] {
  return getDb().prepare('SELECT id, username, email, role, active, created_at FROM users ORDER BY id').all() as Omit<User, 'password'>[];
}

export function createUser(username: string, email: string, password: string, role: string = 'user'): User {
  const hashed = bcrypt.hashSync(password, 12);
  const result = getDb().prepare(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, hashed, role);
  return findUserById(result.lastInsertRowid as number)!;
}

export function updateUser(id: number, data: { username?: string; email?: string; password?: string; role?: string; active?: number }) {
  const db = getDb();
  if (data.password) {
    data.password = bcrypt.hashSync(data.password, 12);
  }
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values);
}

export function deleteUser(id: number) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}
