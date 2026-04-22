import express from 'express'
import session from 'express-session'
import bcrypt from 'bcryptjs'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  findByUsername, findById, getAllUsers, createUser, updateUser, deleteUser,
  getAllStations, getActiveStations, createStation, updateStation, deleteStation,
  getContacts, updateContact,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001
app.set('trust proxy', 1)

// ── Security headers ─────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://www.youtube.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://i.ytimg.com'],
      mediaSrc: ["'self'", 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,             // needed for audio streams
}))

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))

app.use(session({
  secret: process.env.SESSION_SECRET || 'bK9mX2pQ7nR4vY8wZ1aE5cF3jH6tL0sD-balkonek',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}))

// ── Rate limiting ────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', apiLimiter)

// ── Helpers ──────────────────────────────────────────────

const VALID_ROLES = new Set(['admin', 'user'])
const VALID_CONTACT_KEYS = new Set(['description', 'email', 'location', 'github', 'twitter', 'availability'])

function isValidUrl(str) {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

function isValidYoutubeUrl(str) {
  try {
    const u = new URL(str)
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be'))
  } catch { return false }
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
}

function trim(val) {
  return typeof val === 'string' ? val.trim() : val
}

// ── Middleware ───────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' })
  const user = findById(req.session.userId)
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  req.user = user
  next()
}

// ── Auth ─────────────────────────────────────────────────

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const username = trim(req.body.username)
  const { password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })
  if (username.length > 64 || password.length > 128) return res.status(400).json({ error: 'Invalid credentials' })
  const user = findByUsername(username)
  if (!user || !user.active) return res.status(401).json({ error: 'Invalid username or password' })
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid username or password' })
  req.session.userId = user.id
  const { password: _, ...safeUser } = user
  res.json({ user: safeUser })
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy()
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json(null)
  const user = findById(req.session.userId)
  if (!user || !user.active) return res.status(401).json(null)
  const { password: _, ...safeUser } = user
  res.json(safeUser)
})

// ── Public: Stations ─────────────────────────────────────

app.get('/api/stations', (req, res) => {
  res.json(getActiveStations())
})

// ── Public: Contacts ─────────────────────────────────────

app.get('/api/contacts', (req, res) => {
  res.json(getContacts())
})

// ── Admin: Users ─────────────────────────────────────────

app.get('/api/admin/users', requireAdmin, (req, res) => {
  res.json(getAllUsers())
})

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const username = trim(req.body.username)
  const email = trim(req.body.email)
  const { password } = req.body
  const role = trim(req.body.role) || 'user'

  if (!username || !email || !password) return res.status(400).json({ error: 'Missing required fields' })
  if (username.length > 64) return res.status(400).json({ error: 'Username too long (max 64)' })
  if (email.length > 254 || !isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (password.length > 128) return res.status(400).json({ error: 'Password too long' })
  if (!VALID_ROLES.has(role)) return res.status(400).json({ error: 'Invalid role' })

  try {
    const user = createUser(username, email, password, role)
    const { password: _, ...safe } = user
    res.status(201).json(safe)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/admin/users', requireAdmin, (req, res) => {
  const { id, ...raw } = req.body
  if (!id) return res.status(400).json({ error: 'Missing id' })

  const data = {}
  if (raw.username !== undefined) {
    const v = trim(raw.username)
    if (!v || v.length > 64) return res.status(400).json({ error: 'Invalid username' })
    data.username = v
  }
  if (raw.email !== undefined) {
    const v = trim(raw.email)
    if (!v || v.length > 254 || !isValidEmail(v)) return res.status(400).json({ error: 'Invalid email address' })
    data.email = v
  }
  if (raw.password) {
    if (raw.password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    if (raw.password.length > 128) return res.status(400).json({ error: 'Password too long' })
    data.password = raw.password
  }
  if (raw.role !== undefined) {
    if (!VALID_ROLES.has(raw.role)) return res.status(400).json({ error: 'Invalid role' })
    data.role = raw.role
  }
  if (raw.active !== undefined) {
    data.active = raw.active ? 1 : 0
  }

  try { updateUser(Number(id), data); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/admin/users', requireAdmin, (req, res) => {
  const id = req.query.id
  if (!id) return res.status(400).json({ error: 'Missing id' })
  if (Number(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' })
  deleteUser(Number(id))
  res.json({ success: true })
})

// ── Admin: Stations ──────────────────────────────────────

app.get('/api/admin/stations', requireAdmin, (req, res) => {
  res.json(getAllStations())
})

app.post('/api/admin/stations', requireAdmin, async (req, res) => {
  const name = trim(req.body.name)
  const description = trim(req.body.description) || ''
  const genre = trim(req.body.genre) || ''
  const sort_order = parseInt(req.body.sort_order, 10) || 0
  const raw_urls = req.body.stream_urls || []
  const youtube_url = trim(req.body.youtube_url) || ''

  if (!name || name.length > 128) return res.status(400).json({ error: 'Station name is required (max 128 chars)' })
  if (description.length > 512) return res.status(400).json({ error: 'Description too long (max 512)' })
  if (genre.length > 64) return res.status(400).json({ error: 'Genre too long (max 64)' })
  if (youtube_url && !isValidYoutubeUrl(youtube_url)) return res.status(400).json({ error: 'Invalid YouTube URL' })

  const stream_urls = Array.isArray(raw_urls) ? raw_urls.map(u => trim(u)).filter(Boolean) : []
  if (!youtube_url && !stream_urls.length) return res.status(400).json({ error: 'Either a YouTube URL or at least one stream URL is required' })
  const invalid = stream_urls.find(u => !isValidUrl(u))
  if (invalid) return res.status(400).json({ error: `Invalid stream URL: ${invalid}` })

  try {
    const station = createStation(name, description, stream_urls, genre, sort_order, youtube_url)
    res.status(201).json(station)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/admin/stations', requireAdmin, (req, res) => {
  const { id, ...raw } = req.body
  if (!id) return res.status(400).json({ error: 'Missing id' })

  const data = {}
  if (raw.name !== undefined) {
    const v = trim(raw.name)
    if (!v || v.length > 128) return res.status(400).json({ error: 'Invalid station name' })
    data.name = v
  }
  if (raw.description !== undefined) {
    const v = trim(raw.description)
    if (v.length > 512) return res.status(400).json({ error: 'Description too long (max 512)' })
    data.description = v
  }
  if (raw.genre !== undefined) {
    const v = trim(raw.genre)
    if (v.length > 64) return res.status(400).json({ error: 'Genre too long (max 64)' })
    data.genre = v
  }
  if (raw.sort_order !== undefined) {
    const v = parseInt(raw.sort_order, 10)
    if (isNaN(v)) return res.status(400).json({ error: 'sort_order must be a number' })
    data.sort_order = v
  }
  if (raw.active !== undefined) {
    data.active = raw.active ? 1 : 0
  }
  if (raw.stream_urls !== undefined) {
    if (!Array.isArray(raw.stream_urls)) return res.status(400).json({ error: 'stream_urls must be an array' })
    const urls = raw.stream_urls.map(u => trim(u)).filter(Boolean)
    const invalid = urls.find(u => !isValidUrl(u))
    if (invalid) return res.status(400).json({ error: `Invalid stream URL: ${invalid}` })
    data.stream_urls = urls
  }
  if (raw.youtube_url !== undefined) {
    const v = trim(raw.youtube_url)
    if (v && !isValidYoutubeUrl(v)) return res.status(400).json({ error: 'Invalid YouTube URL' })
    data.youtube_url = v
  }

  try {
    updateStation(Number(id), data)
    res.json({ success: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/admin/stations', requireAdmin, (req, res) => {
  const id = req.query.id
  if (!id) return res.status(400).json({ error: 'Missing id' })
  deleteStation(Number(id))
  res.json({ success: true })
})

// ── Admin: Contacts ──────────────────────────────────────

app.put('/api/admin/contacts', requireAdmin, (req, res) => {
  const key = trim(req.body.key)
  const value = trim(req.body.value ?? '')

  if (!key || !VALID_CONTACT_KEYS.has(key)) return res.status(400).json({ error: 'Invalid contact key' })
  if (value.length > 512) return res.status(400).json({ error: 'Value too long (max 512)' })

  // Validate URL fields
  if (['github', 'twitter'].includes(key) && value) {
    if (!isValidUrl(value.startsWith('http') ? value : `https://${value}`)) {
      return res.status(400).json({ error: `${key} must be a valid URL` })
    }
  }
  if (key === 'email' && value && !isValidEmail(value)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  try { updateContact(key, value); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Serve React build ────────────────────────────────────

const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running on http://0.0.0.0:${PORT}`)
})
