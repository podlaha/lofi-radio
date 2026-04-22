import { useState, useEffect } from 'react'
import { Users, Radio, Phone, Plus, Trash2, Edit2, CheckCircle, XCircle, Shield, AlertCircle, X, Save, RefreshCw } from 'lucide-react'

// ── Users tab ────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error()
      setUsers(await res.json())
    } catch { setError('Failed to load users.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  function showSuccess(msg) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  function openAdd() { setForm({ username: '', email: '', password: '', role: 'user' }); setFormError(''); setEditUser(null); setShowModal(true) }
  function openEdit(u) { setForm({ username: u.username, email: u.email, password: '', role: u.role }); setFormError(''); setEditUser(u); setShowModal(true) }

  async function handleSubmit(e) {
    e.preventDefault(); setFormError(''); setFormLoading(true)
    const username = form.username.trim()
    const email = form.email.trim()
    const password = form.password
    if (!username) { setFormError('Username is required.'); setFormLoading(false); return }
    if (!email) { setFormError('Email is required.'); setFormLoading(false); return }
    if (!editUser && !password) { setFormError('Password is required.'); setFormLoading(false); return }
    if (password && password.length < 8) { setFormError('Password must be at least 8 characters.'); setFormLoading(false); return }
    try {
      let res
      if (editUser) {
        const body = { id: editUser.id, username, email, role: form.role }
        if (password) body.password = password
        res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, role: form.role }) })
      }
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setShowModal(false); await fetchUsers(); showSuccess(editUser ? 'User updated.' : 'User created.')
    } catch (e) { setFormError(e.message) }
    finally { setFormLoading(false) }
  }

  async function toggleActive(u) {
    await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, active: u.active ? 0 : 1 }) })
    await fetchUsers(); showSuccess(`User ${u.active ? 'deactivated' : 'activated'}.`)
  }

  async function handleDelete(u) {
    if (!confirm(`Delete "${u.username}"?`)) return
    const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })
    if (!res.ok) { setError((await res.json()).error); return }
    await fetchUsers(); showSuccess('User deleted.')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-[#e6edf3]">User Management</h2>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="p-2 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#e8a020] transition-all"><RefreshCw size={14} /></button>
          <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e8a020] hover:bg-[#f5b830] text-white text-xs font-medium transition-all"><Plus size={14} /> Add User</button>
        </div>
      </div>

      {successMsg && <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs mb-4"><CheckCircle size={14} /> {successMsg}</div>}
      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs mb-4"><AlertCircle size={14} />{error}<button onClick={() => setError('')} className="ml-auto"><X size={12} /></button></div>}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-[#e8a020]/30 border-t-[#e8a020] rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[#2c3138] hover:border-[#30363d] transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e8a020] to-[#f07020] flex items-center justify-center text-white text-xs font-bold shrink-0">{u.username[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e6edf3] truncate">{u.username}</p>
                <p className="text-xs text-[#484f58] truncate">{u.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'border-[#a371f7]/30 text-[#a371f7]' : 'border-[#30363d] text-[#484f58]'}`}>{u.role}</span>
              <button onClick={() => toggleActive(u)} className="shrink-0">
                {u.active ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-[#484f58]" />}
              </button>
              <button onClick={() => openEdit(u)} className="p-1.5 text-[#8b949e] hover:text-[#e8a020] transition-colors"><Edit2 size={13} /></button>
              <button onClick={() => handleDelete(u)} className="p-1.5 text-[#8b949e] hover:text-[#f85149] transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-[#e6edf3] text-sm">{editUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8b949e] hover:text-[#e6edf3]"><X size={16} /></button>
            </div>
            {formError && <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs mb-4"><AlertCircle size={12} /> {formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {[['Username', 'text', 'username'], ['Email', 'email', 'email']].map(([label, type, field]) => (
                <div key={field}>
                  <label className="block text-xs text-[#8b949e] mb-1">{label} *</label>
                  <input type={type} required value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#8b949e] mb-1">Password {editUser ? '(leave blank to keep)' : '*'}</label>
                <input type="password" required={!editUser} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-[#8b949e] mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-[#30363d] text-[#8b949e] text-sm hover:text-[#e6edf3] transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#e8a020] hover:bg-[#f5b830] disabled:opacity-60 text-white text-sm font-medium transition-colors">
                  {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={13} /> Save</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stations tab ─────────────────────────────────────────

function StationsTab() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editStation, setEditStation] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', stream_urls: [''], genre: '', sort_order: 0, youtube_url: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  async function fetchStations() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stations')
      if (!res.ok) throw new Error()
      setStations(await res.json())
    } catch { setError('Failed to load stations.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStations() }, [])

  function showSuccess(msg) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  function openAdd() { setForm({ name: '', description: '', stream_urls: [''], genre: '', sort_order: stations.length, youtube_url: '' }); setFormError(''); setEditStation(null); setShowModal(true) }
  function openEdit(s) {
    const urls = s.stream_urls?.length ? s.stream_urls : [s.stream_url || '']
    setForm({ name: s.name, description: s.description, stream_urls: urls, genre: s.genre, sort_order: s.sort_order, youtube_url: s.youtube_url || '' })
    setFormError(''); setEditStation(s); setShowModal(true)
  }

  function setUrl(i, val) { setForm(p => { const u = [...p.stream_urls]; u[i] = val; return { ...p, stream_urls: u } }) }
  function addUrl() { setForm(p => ({ ...p, stream_urls: [...p.stream_urls, ''] })) }
  function removeUrl(i) { setForm(p => ({ ...p, stream_urls: p.stream_urls.filter((_, j) => j !== i) })) }

  async function handleSubmit(e) {
    e.preventDefault(); setFormError(''); setFormLoading(true)
    const name = form.name.trim()
    const genre = form.genre.trim()
    const description = form.description.trim()
    const urls = form.stream_urls.map(u => u.trim()).filter(Boolean)
    const sort_order = parseInt(form.sort_order, 10)
    const youtube_url = form.youtube_url.trim()

    if (!name) { setFormError('Station name is required.'); setFormLoading(false); return }
    if (!youtube_url && !urls.length) { setFormError('Either a YouTube URL or at least one stream URL is required.'); setFormLoading(false); return }
    if (isNaN(sort_order)) { setFormError('Sort order must be a number.'); setFormLoading(false); return }

    const invalidUrl = urls.find(u => { try { const p = new URL(u); return p.protocol !== 'http:' && p.protocol !== 'https:' } catch { return true } })
    if (invalidUrl) { setFormError(`Invalid URL: "${invalidUrl}". Must start with http:// or https://.`); setFormLoading(false); return }

    try {
      let res
      const body = { name, description, stream_urls: urls, genre, sort_order, youtube_url }
      if (editStation) {
        res = await fetch('/api/admin/stations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editStation.id, ...body }) })
      } else {
        res = await fetch('/api/admin/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setShowModal(false); await fetchStations(); showSuccess(editStation ? 'Station updated.' : 'Station added.')
    } catch (e) { setFormError(e.message) }
    finally { setFormLoading(false) }
  }

  async function toggleActive(s) {
    await fetch('/api/admin/stations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, active: s.active ? 0 : 1 }) })
    await fetchStations(); showSuccess(`Station ${s.active ? 'disabled' : 'enabled'}.`)
  }

  async function handleDelete(s) {
    if (!confirm(`Delete "${s.name}"?`)) return
    await fetch(`/api/admin/stations?id=${s.id}`, { method: 'DELETE' })
    await fetchStations(); showSuccess('Station deleted.')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Radio Stations</h2>
        <div className="flex gap-2">
          <button onClick={fetchStations} className="p-2 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#e8a020] transition-all"><RefreshCw size={14} /></button>
          <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e8a020] hover:bg-[#f5b830] text-white text-xs font-medium transition-all"><Plus size={14} /> Add Station</button>
        </div>
      </div>

      {successMsg && <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs mb-4"><CheckCircle size={14} /> {successMsg}</div>}
      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs mb-4"><AlertCircle size={14} />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-[#e8a020]/30 border-t-[#e8a020] rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {stations.map(s => (
            <div key={s.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${s.active ? 'border-[#2c3138] hover:border-[#30363d]' : 'border-[#1f2428] opacity-50'}`}>
              <Radio size={14} className={s.active ? 'text-[#e8a020] shrink-0' : 'text-[#484f58] shrink-0'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#e6edf3] truncate">{s.name}</p>
                  {s.youtube_url && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-medium">LIVE</span>}
                </div>
                <p className="text-xs text-[#484f58] truncate">{s.genre}{s.description ? ` · ${s.description}` : ''}</p>
              </div>
              <button onClick={() => toggleActive(s)} className="shrink-0">
                {s.active ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-[#484f58]" />}
              </button>
              <button onClick={() => openEdit(s)} className="p-1.5 text-[#8b949e] hover:text-[#e8a020] transition-colors"><Edit2 size={13} /></button>
              <button onClick={() => handleDelete(s)} className="p-1.5 text-[#8b949e] hover:text-[#f85149] transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}
          {stations.length === 0 && <p className="text-sm text-[#484f58] text-center py-8">No stations yet.</p>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-[#e6edf3] text-sm">{editStation ? 'Edit Station' : 'Add Station'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8b949e] hover:text-[#e6edf3]"><X size={16} /></button>
            </div>
            {formError && <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-xs mb-4"><AlertCircle size={12} /> {formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {[['Name', 'text', 'name', true], ['Genre', 'text', 'genre', false], ['Description', 'text', 'description', false]].map(([label, type, field, required]) => (
                <div key={field}>
                  <label className="block text-xs text-[#8b949e] mb-1">{label}{required ? ' *' : ''}</label>
                  <input type={type} required={required} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#8b949e] mb-1">YouTube URL <span className="text-[#484f58] font-normal">(paste a YouTube link to embed the stream)</span></label>
                <input type="url" placeholder="https://www.youtube.com/watch?v=..." value={form.youtube_url} onChange={e => setForm(p => ({ ...p, youtube_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-[#8b949e] mb-1">
                  Stream URLs {!form.youtube_url && '*'} <span className="text-[#484f58] font-normal">{form.youtube_url ? '(optional when YouTube URL is set)' : '(first = primary, rest = fallbacks)'}</span>
                </label>
                <div className="space-y-2">
                  {form.stream_urls.map((url, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="url" placeholder={i === 0 ? 'Primary stream URL' : `Fallback ${i}`}
                        value={url} onChange={e => setUrl(i, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors min-w-0" />
                      {form.stream_urls.length > 1 && (
                        <button type="button" onClick={() => removeUrl(i)} className="text-[#484f58] hover:text-[#f85149] transition-colors shrink-0"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addUrl}
                  className="mt-2 text-xs text-[#484f58] hover:text-[#e8a020] transition-colors flex items-center gap-1">
                  <Plus size={11} /> Add fallback URL
                </button>
              </div>
              <div>
                <label className="block text-xs text-[#8b949e] mb-1">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-[#30363d] text-[#8b949e] text-sm hover:text-[#e6edf3] transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#e8a020] hover:bg-[#f5b830] disabled:opacity-60 text-white text-sm font-medium transition-colors">
                  {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={13} /> Save</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Contacts tab ─────────────────────────────────────────

function ContactsTab() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [values, setValues] = useState({})

  async function fetchContacts() {
    setLoading(true)
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(data)
    setValues(Object.fromEntries(data.map(c => [c.key, c.value])))
    setLoading(false)
  }

  useEffect(() => { fetchContacts() }, [])

  function showSuccess(msg) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  async function saveAll() {
    setSaving(true)
    try {
      const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, (v ?? '').trim()]))
      const results = await Promise.all(contacts.map(({ key }) =>
        fetch('/api/admin/contacts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: trimmed[key] ?? '' }),
        }).then(r => r.json())
      ))
      const err = results.find(r => r.error)
      if (err) { showSuccess(''); alert(`Save error: ${err.error}`); return }
      setValues(trimmed)
      showSuccess('Changes saved.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-[#e8a020]/30 border-t-[#e8a020] rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Contact Information</h2>
      </div>
      {successMsg && <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs mb-4"><CheckCircle size={14} /> {successMsg}</div>}
      <div className="space-y-4">
        {contacts.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs text-[#8b949e] mb-1 font-mono">{label}</label>
            {key === 'description' ? (
              <textarea rows={3} value={values[key] ?? ''} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors resize-none" />
            ) : (
              <input type="text" value={values[key] ?? ''} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm focus:outline-none focus:border-[#e8a020] transition-colors" />
            )}
          </div>
        ))}
      </div>
      <button onClick={saveAll} disabled={saving}
        className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e8a020] hover:bg-[#f5b830] disabled:opacity-60 text-white text-sm font-medium transition-colors">
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
        Save Changes
      </button>
    </div>
  )
}

// ── Main Admin page ──────────────────────────────────────

const TABS = [
  { id: 'stations', label: 'Stations', icon: Radio },
  { id: 'contacts', label: 'Contacts', icon: Phone },
  { id: 'users', label: 'Users', icon: Users },
]

export default function Admin() {
  const [tab, setTab] = useState('stations')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-2 mb-8">
        <Shield size={16} className="text-[#e8a020]" />
        <h1 className="text-lg font-bold text-[#e6edf3]">Admin Panel</h1>
      </div>

      <div className="flex gap-1 mb-8 border-b border-[#2c3138]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === id
                ? 'border-[#e8a020] text-[#e8a020]'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'stations' && <StationsTab />}
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}
