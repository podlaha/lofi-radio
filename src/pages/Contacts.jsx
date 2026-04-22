import { useState, useEffect } from 'react'
import { Mail, MapPin, Clock, Github, Twitter } from 'lucide-react'

const ICONS = {
  email: Mail,
  location: MapPin,
  availability: Clock,
  github: Github,
  twitter: Twitter,
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/contacts')
      .then(r => r.json())
      .then(data => { setContacts(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#e8a020]/30 border-t-[#e8a020] rounded-full animate-spin" />
      </div>
    )
  }

  const byKey = Object.fromEntries(contacts.map(c => [c.key, c]))
  const description = byKey.description?.value
  const links = contacts.filter(c => ['email', 'github', 'twitter'].includes(c.key) && c.value)
  const info = contacts.filter(c => ['location', 'availability'].includes(c.key) && c.value)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">

        <div className="mb-10">
          <p className="text-[10px] text-[#484f58] tracking-widest uppercase font-mono mb-3">Contact</p>
          {description && (
            <p className="text-[#8b949e] text-sm leading-relaxed">{description}</p>
          )}
        </div>

        {info.length > 0 && (
          <div className="space-y-3 mb-8">
            {info.map(({ key, label, value }) => {
              const Icon = ICONS[key]
              return (
                <div key={key} className="flex items-center gap-3 text-sm">
                  {Icon && <Icon size={14} className="text-[#484f58] shrink-0" />}
                  <span className="text-[#484f58] w-24 shrink-0 font-mono text-xs">{label}</span>
                  <span className="text-[#8b949e]">{value}</span>
                </div>
              )
            })}
          </div>
        )}

        {links.length > 0 && (
          <div className="space-y-2">
            {links.map(({ key, label, value }) => {
              const Icon = ICONS[key]
              const rawHref = key === 'email' ? `mailto:${value}` : value.startsWith('http') ? value : `https://${value}`
              let href = '#'
              try {
                const u = new URL(rawHref)
                if (['http:', 'https:', 'mailto:'].includes(u.protocol)) href = rawHref
              } catch {}
              return (
                <a key={key} href={href} target={key !== 'email' ? '_blank' : undefined} rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#2c3138] hover:border-[#e8a020]/40 hover:text-[#e8a020] text-[#8b949e] transition-all duration-200 text-sm group">
                  {Icon && <Icon size={14} className="shrink-0 group-hover:text-[#e8a020] transition-colors" />}
                  <span className="font-mono text-xs text-[#484f58] w-16 shrink-0">{label}</span>
                  <span className="truncate">{value}</span>
                </a>
              )
            })}
          </div>
        )}

        {contacts.length === 0 && (
          <p className="text-sm text-[#484f58]">No contact information available yet.</p>
        )}
      </div>
    </div>
  )
}
