import express from 'express'
import session from 'express-session'
import bcrypt from 'bcryptjs'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  findByUsername, findById, getAllUsers, createUser, updateUser, deleteUser,
  getAllStations, getActiveStations, getStationById, createStation, updateStation, deleteStation,
  getContacts, updateContact,
} from './db.js'
import { startLiveRefresh, refreshStation } from './youtubeLive.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001
app.set('trust proxy', 1)

// Refuse to start without a real session secret rather than silently signing
// cookies with a well-known fallback value - that fallback previously lived
// here as source code, which is public in this repo's git history.
if (!process.env.SESSION_SECRET) {
  console.error('[server] FATAL: SESSION_SECRET environment variable is not set.')
  console.error('[server] Set it before starting the server, e.g.: SESSION_SECRET=$(openssl rand -hex 32)')
  process.exit(1)
}

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
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // 'auto' marks the cookie Secure when the request is actually HTTPS - works
  // in production behind the Traefik/Cloudflare proxy (via the 'trust proxy'
  // setting above and the resulting X-Forwarded-Proto header) while still
  // allowing plain-HTTP local development without a reverse proxy.
  cookie: { secure: 'auto', httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
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

// Accepts a bare channel ID (UCxxxxxxxx...), a handle (@name), or a full
// channel URL (youtube.com/channel/UC... or youtube.com/@name) and returns
// the bare ID/handle youtubeLive.js expects.
function extractChannelId(str) {
  if (!str) return ''
  const trimmed = str.trim()
  let m = trimmed.match(/youtube\.com\/channel\/([\w-]+)/)
  if (m) return m[1]
  m = trimmed.match(/youtube\.com\/(@[\w.-]+)/)
  if (m) return m[1]
  return trimmed
}

function isValidChannelId(str) {
  return /^UC[\w-]{20,26}$/.test(str) || /^@[\w.-]{2,64}$/.test(str)
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
  const youtube_channel_id = extractChannelId(trim(req.body.youtube_channel_id) || '')
  const youtube_title_match = trim(req.body.youtube_title_match) || ''

  if (!name || name.length > 128) return res.status(400).json({ error: 'Station name is required (max 128 chars)' })
  if (description.length > 512) return res.status(400).json({ error: 'Description too long (max 512)' })
  if (genre.length > 64) return res.status(400).json({ error: 'Genre too long (max 64)' })
  if (youtube_url && !isValidYoutubeUrl(youtube_url)) return res.status(400).json({ error: 'Invalid YouTube URL' })
  if (youtube_channel_id && !isValidChannelId(youtube_channel_id)) return res.status(400).json({ error: 'Invalid YouTube channel ID/handle/URL' })
  if (youtube_title_match.length > 128) return res.status(400).json({ error: 'Live title match too long (max 128)' })

  const stream_urls = Array.isArray(raw_urls) ? raw_urls.map(u => trim(u)).filter(Boolean) : []
  // Not required when auto-refresh is configured - it'll populate youtube_url
  // on its own within a few minutes, with no manual seed value needed.
  if (!youtube_url && !stream_urls.length && !youtube_channel_id) {
    return res.status(400).json({ error: 'Either a YouTube URL, a stream URL, or an auto-refresh channel is required' })
  }
  const invalid = stream_urls.find(u => !isValidUrl(u))
  if (invalid) return res.status(400).json({ error: `Invalid stream URL: ${invalid}` })

  try {
    const station = createStation(name, description, stream_urls, genre, sort_order, youtube_url, youtube_channel_id, youtube_title_match)
    // Resolve the live video immediately instead of leaving the station
    // unplayable until the background poller's next scheduled cycle.
    if (station.youtube_channel_id) await refreshStation(station)
    res.status(201).json(getStationById(station.id))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/admin/stations', requireAdmin, async (req, res) => {
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
  if (raw.youtube_channel_id !== undefined) {
    const v = extractChannelId(trim(raw.youtube_channel_id))
    if (v && !isValidChannelId(v)) return res.status(400).json({ error: 'Invalid YouTube channel ID/handle/URL' })
    data.youtube_channel_id = v
  }
  if (raw.youtube_title_match !== undefined) {
    const v = trim(raw.youtube_title_match)
    if (v.length > 128) return res.status(400).json({ error: 'Live title match too long (max 128)' })
    data.youtube_title_match = v
  }

  try {
    updateStation(Number(id), data)
    // Resolve the live video immediately instead of leaving the station
    // unplayable (or stale) until the background poller's next scheduled cycle.
    const station = getStationById(Number(id))
    if (station?.youtube_channel_id) await refreshStation(station)
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
  startLiveRefresh()
})
