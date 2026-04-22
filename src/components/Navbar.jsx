import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Menu, X, LogOut, Settings, ChevronDown } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/contacts', label: 'Contacts' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 nav-blur bg-[rgba(13,17,23,0.85)] border-b border-[#30363d]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <img src="/lofi_radio_icon.svg" alt="LoFi radio" className="w-[42px] h-[42px]" />
            <span className="gradient-text">LoFi radio</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} to={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === href
                    ? 'text-[#e8a020]'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}>
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#2c3138] transition-all duration-200 text-sm">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#e8a020] to-[#f07020] flex items-center justify-center text-white text-xs font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="text-[#8b949e] font-medium">{user.username}</span>
                  <ChevronDown size={13} className="text-[#8b949e]" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 glass-card shadow-xl py-1 z-50">
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors">
                        <Settings size={13} /> Admin Panel
                      </Link>
                    )}
                    <button onClick={() => { setUserMenuOpen(false); handleLogout() }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#f85149] hover:bg-[#30363d] transition-colors">
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="px-3 py-1.5 rounded-lg border border-[#30363d] hover:border-[#e8a020] text-[#8b949e] hover:text-[#e8a020] text-sm font-medium transition-all duration-200">
                Sign In
              </Link>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#30363d] bg-[#181c20] px-4 py-3 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link key={href} to={href} onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === href ? 'text-[#e8a020]' : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}>
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#30363d]">
            {user ? (
              <div className="space-y-1">
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3]">
                    <Settings size={13} /> Admin Panel
                  </Link>
                )}
                <button onClick={() => { setMobileOpen(false); handleLogout() }}
                  className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-sm text-[#f85149]">
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm text-[#8b949e] hover:text-[#e8a020]">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
