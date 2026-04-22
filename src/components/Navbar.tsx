'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X, LogOut, Settings, User, ChevronDown } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/contacts', label: 'Contacts' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = (session?.user as { role?: string })?.role === 'admin';

  return (
    <nav className="sticky top-0 z-50 nav-blur bg-[rgba(13,17,23,0.85)] border-b border-[#30363d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e8a020] to-[#f07020] flex items-center justify-center text-white text-sm font-black">
              B
            </span>
            <span className="gradient-text">balkonek.eu</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === href
                    ? 'bg-[#c07010] text-white'
                    : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#2c3138]'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2c3138] hover:bg-[#30363d] transition-all duration-200 text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e8a020] to-[#f07020] flex items-center justify-center text-white text-xs font-bold">
                    {session.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-[#e6edf3] font-medium">{session.user?.name}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-[#c07010] text-white font-medium">
                      Admin
                    </span>
                  )}
                  <ChevronDown size={14} className="text-[#8b949e]" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass-card shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-[#30363d]">
                      <p className="text-xs text-[#8b949e]">Signed in as</p>
                      <p className="text-sm font-medium text-[#e6edf3] truncate">{session.user?.email}</p>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors"
                      >
                        <Settings size={14} />
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors"
                    >
                      <User size={14} />
                      Profile
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); signOut(); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#f85149] hover:bg-[#30363d] transition-colors"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-[#e8a020] hover:bg-[#f5b830] text-white text-sm font-medium transition-all duration-200 glow-blue"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#2c3138] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#30363d] bg-[#181c20] px-4 py-4 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-[#c07010] text-white'
                  : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#2c3138]'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#30363d]">
            {session ? (
              <div className="space-y-1">
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#2c3138]"
                  >
                    <Settings size={14} /> Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => { setMobileOpen(false); signOut(); }}
                  className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-sm text-[#f85149] hover:bg-[#2c3138]"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm font-medium bg-[#e8a020] text-white text-center"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
