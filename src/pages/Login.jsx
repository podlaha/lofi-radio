import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#e8a020] rounded-full opacity-[0.04] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8a020] to-[#f07020] flex items-center justify-center text-white text-xl font-black mx-auto mb-4">B</div>
            <h1 className="text-2xl font-bold text-[#e6edf3]">Welcome back</h1>
            <p className="text-sm text-[#8b949e] mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-sm mb-6">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Username</label>
              <input type="text" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" placeholder="Enter your username"
                className="w-full px-4 py-2.5 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-[#e8a020] transition-colors" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#8b949e]">Password</label>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-[#2c3138] border border-[#30363d] text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-[#e8a020] transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#e8a020] hover:bg-[#f5b830] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 glow-blue">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</> : <><LogIn size={16} /> Sign In</>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#30363d] text-center">
            <p className="text-xs text-[#8b949e]">Don't have an account? <Link to="/contacts" className="text-[#e8a020] hover:text-[#f5b830] transition-colors">Contact us</Link></p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
