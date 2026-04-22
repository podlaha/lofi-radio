import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const DB_FILE = path.join(dataDir, 'balkonek.db')

const initSqlJs = require('sql.js')
const SQL = await initSqlJs()

let db

if (fs.existsSync(DB_FILE)) {
  const filebuffer = fs.readFileSync(DB_FILE)
  db = new SQL.Database(filebuffer)
} else {
  db = new SQL.Database()
}

function save() {
  const data = db.export()
  fs.writeFileSync(DB_FILE, Buffer.from(data))
}

// ── Schema ───────────────────────────────────────────────

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
  );
`)

db.run(`
  CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    stream_url TEXT NOT NULL DEFAULT '',
    stream_urls TEXT NOT NULL DEFAULT '[]',
    genre TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
`)

// Migration: add stream_urls column if it doesn't exist yet
try {
  db.run("ALTER TABLE stations ADD COLUMN stream_urls TEXT NOT NULL DEFAULT '[]'")
  console.log('[DB] Migrated: added stream_urls column.')
} catch (_) { /* column already exists */ }

// Migration: add youtube_url column if it doesn't exist yet
try {
  db.run("ALTER TABLE stations ADD COLUMN youtube_url TEXT NOT NULL DEFAULT ''")
  console.log('[DB] Migrated: added youtube_url column.')
} catch (_) { /* column already exists */ }

// Migrate existing rows: populate stream_urls from stream_url where still empty
const needsMigration = db.exec("SELECT id, stream_url FROM stations WHERE stream_urls = '[]'")
if (needsMigration.length && needsMigration[0].values.length) {
  for (const [id, url] of needsMigration[0].values) {
    if (url) db.run('UPDATE stations SET stream_urls = ? WHERE id = ?', [JSON.stringify([url]), id])
  }
  save()
  console.log('[DB] Migrated stream_url → stream_urls for existing stations.')
}

db.run(`
  CREATE TABLE IF NOT EXISTS contacts (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT ''
  );
`)

// ── Seeds ────────────────────────────────────────────────

const userCount = db.exec('SELECT COUNT(*) as c FROM users')[0]?.values[0][0] || 0
if (userCount === 0) {
  const hashed = bcrypt.hashSync('Admin@2024!', 12)
  db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    ['admin', 'admin@balkonek.eu', hashed, 'admin'])
  save()
  console.log('[DB] Admin user created — username: admin, password: Admin@2024!')
}

const stationCount = db.exec('SELECT COUNT(*) as c FROM stations')[0]?.values[0][0] || 0
if (stationCount === 0) {
  const stations = [
    ['Beat Blender', 'A late night blend of deep-house and other delights', ['https://ice6.somafm.com/beatblender-128-mp3', 'https://ice2.somafm.com/beatblender-128-mp3'], 'Lo-Fi / Deep House', 1, 0],
    ['Groove Salad', 'A nicely chilled plate of ambient / downtempo beats', ['https://ice6.somafm.com/groovesalad-256-mp3', 'https://ice2.somafm.com/groovesalad-256-mp3'], 'Ambient', 1, 1],
    ['Drone Zone', 'Atmospheric, slow and textured', ['https://ice6.somafm.com/dronezone-256-mp3', 'https://ice2.somafm.com/dronezone-256-mp3'], 'Ambient', 1, 2],
    ['Nightwave Plaza', 'City pop, vaporwave and more', ['https://radio.plaza.one/mp3'], 'Vaporwave', 1, 3],
  ]
  for (const [name, description, stream_urls, genre, active, sort_order] of stations) {
    db.run(
      'INSERT INTO stations (name, description, stream_url, stream_urls, genre, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, stream_urls[0], JSON.stringify(stream_urls), genre, active, sort_order]
    )
  }
  save()
  console.log('[DB] Stations seeded.')
}

const contactCount = db.exec('SELECT COUNT(*) as c FROM contacts')[0]?.values[0][0] || 0
if (contactCount === 0) {
  const contacts = [
    ['description', 'About', 'Just a chill corner of the internet. Lo-Fi beats, good vibes.'],
    ['email', 'Email', 'info@balkonek.eu'],
    ['location', 'Location', 'Ostrava, Czech Republic'],
    ['github', 'GitHub', ''],
    ['twitter', 'Twitter / X', ''],
    ['availability', 'Availability', 'Usually online in the evenings (CET)'],
  ]
  for (const [key, label, value] of contacts) {
    db.run('INSERT INTO contacts (key, label, value) VALUES (?, ?, ?)', [key, label, value])
  }
  save()
  console.log('[DB] Contacts seeded.')
}

// ── User helpers ─────────────────────────────────────────

export function findByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
  stmt.bind([username])
  if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row }
  stmt.free(); return null
}

export function findById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  stmt.bind([id])
  if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row }
  stmt.free(); return null
}

export function getAllUsers() {
  const result = db.exec('SELECT id, username, email, role, active, created_at FROM users ORDER BY id')
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])))
}

export function createUser(username, email, password, role = 'user') {
  const hashed = bcrypt.hashSync(password, 12)
  db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hashed, role])
  save()
  // Use db.exec (not prepare/step) to avoid sql.js quirk where newly prepared
  // statements can't see rows inserted via db.run in the same tick.
  const result = db.exec('SELECT * FROM users ORDER BY id DESC LIMIT 1')
  if (!result.length) return null
  const { columns, values } = result[0]
  return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]))
}

const ALLOWED_USER_FIELDS = new Set(['username', 'email', 'password', 'role', 'active'])

export function updateUser(id, data) {
  const safe = Object.fromEntries(Object.entries(data).filter(([k]) => ALLOWED_USER_FIELDS.has(k)))
  if (!Object.keys(safe).length) return
  if (safe.password) safe.password = bcrypt.hashSync(safe.password, 12)
  const fields = Object.keys(safe).map(k => `${k} = ?`).join(', ')
  db.run(`UPDATE users SET ${fields} WHERE id = ?`, [...Object.values(safe), id])
  save()
}

export function deleteUser(id) {
  db.run('DELETE FROM users WHERE id = ?', [id])
  save()
}

// ── Station helpers ──────────────────────────────────────

function parseStation(row) {
  if (row.stream_urls) {
    try { row.stream_urls = JSON.parse(row.stream_urls) } catch { row.stream_urls = [row.stream_url] }
  } else {
    row.stream_urls = row.stream_url ? [row.stream_url] : []
  }
  return row
}

export function getAllStations() {
  const result = db.exec('SELECT * FROM stations ORDER BY sort_order, id')
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => parseStation(Object.fromEntries(columns.map((col, i) => [col, row[i]]))))
}

export function getActiveStations() {
  const result = db.exec('SELECT * FROM stations WHERE active = 1 ORDER BY sort_order, id')
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => parseStation(Object.fromEntries(columns.map((col, i) => [col, row[i]]))))
}

export function createStation(name, description, stream_urls, genre, sort_order = 0, youtube_url = '') {
  const urls = Array.isArray(stream_urls) ? stream_urls : [stream_urls]
  db.run(
    'INSERT INTO stations (name, description, stream_url, stream_urls, genre, sort_order, youtube_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, description, urls[0] || '', JSON.stringify(urls), genre, sort_order, youtube_url]
  )
  save()
  const result = db.exec('SELECT * FROM stations ORDER BY id DESC LIMIT 1')
  if (!result.length) return null
  const { columns, values } = result[0]
  return parseStation(Object.fromEntries(columns.map((col, i) => [col, values[0][i]])))
}

const ALLOWED_STATION_FIELDS = new Set(['name', 'description', 'stream_url', 'stream_urls', 'genre', 'active', 'sort_order', 'youtube_url'])

export function updateStation(id, data) {
  if (data.stream_urls !== undefined) {
    const urls = Array.isArray(data.stream_urls) ? data.stream_urls : [data.stream_urls]
    data.stream_url = urls[0] || ''
    data.stream_urls = JSON.stringify(urls)
  }
  const safe = Object.fromEntries(Object.entries(data).filter(([k]) => ALLOWED_STATION_FIELDS.has(k)))
  if (!Object.keys(safe).length) return
  const fields = Object.keys(safe).map(k => `${k} = ?`).join(', ')
  db.run(`UPDATE stations SET ${fields} WHERE id = ?`, [...Object.values(safe), id])
  save()
}

export function deleteStation(id) {
  db.run('DELETE FROM stations WHERE id = ?', [id])
  save()
}

// ── Contact helpers ──────────────────────────────────────

export function getContacts() {
  const result = db.exec('SELECT key, label, value FROM contacts ORDER BY rowid')
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])))
}

export function updateContact(key, value) {
  db.run('UPDATE contacts SET value = ? WHERE key = ?', [value, key])
  save()
}
