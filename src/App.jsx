import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader, Radio, ChevronUp } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { RadioProvider, useRadio } from './context/RadioContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Contacts from './pages/Contacts'
import Login from './pages/Login'
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'

function SpacebarToggle() {
  const { togglePlay, current } = useRadio()
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code !== 'Space') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      e.preventDefault()
      if (current) togglePlay()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, current])
  return null
}

function FooterPlayer() {
  const {
    stations, current, isPlaying, volume, muted, buffering, loaded,
    togglePlay, selectStation, setVolumeValue, toggleMute,
  } = useRadio()
  const [stationOpen, setStationOpen] = useState(false)

  if (!loaded || !current) return null

  return (
    <div className="z-40 border-t border-[#30363d] bg-[rgba(13,17,23,0.85)] nav-blur relative" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%' }}>
      <p className="absolute bottom-1 right-2 text-xs text-[#6e7681]">Art &copy; <a href="https://www.reddit.com/user/louisselle_/" target="_blank" rel="noopener noreferrer" style={{ color: '#6e7681', textDecoration: 'none' }}>reddit.com/user/louisselle_/</a></p>
      <div className="py-4 flex justify-center">
      <div className="flex items-center gap-8 w-full" style={{ maxWidth: '900px', paddingLeft: '2rem', paddingRight: '2rem' }}>

        {/* Mini vinyl */}
        <div className={`w-12 h-12 rounded-full shrink-0 ${isPlaying ? 'vinyl-spin' : ''}`} style={{ background: 'linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 22%, transparent 38%), radial-gradient(circle, #e8a020 0%, #c07010 15%, #1a1a1a 16%, #1a1a1a 22%, #2a2a2a 23%, #1a1a1a 30%, #2a2a2a 31%, #1a1a1a 38%, #2a2a2a 39%, #1a1a1a 46%, #2a2a2a 47%, #111 100%)', boxShadow: '0 0 0 2px #444' }} />

        {/* Play / pause */}
        <button onClick={togglePlay}
          className="text-[#8b949e] hover:text-[#e8a020] transition-colors shrink-0">
          {buffering
            ? <Loader size={22} className="animate-spin text-[#e8a020]" />
            : isPlaying ? <Pause size={22} /> : <Play size={22} className="translate-x-px" />}
        </button>

        {/* Station name + live dot */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isPlaying && <span className="w-2 h-2 rounded-full bg-[#e8a020] animate-pulse shrink-0" />}
          <div className="min-w-0">
            <p className="text-base font-medium text-[#e6edf3] truncate leading-tight">{current.name}</p>
            <p className="text-sm text-[#484f58] leading-tight">{current.genre}</p>
          </div>
        </div>

        {/* Station selector */}
        {stations.length > 0 && (
          <div className="relative shrink-0">
            <button onClick={() => setStationOpen(p => !p)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#2c3138] hover:border-[#e8a020]/40 text-[#8b949e] hover:text-[#e6edf3] text-sm transition-all duration-200">
              <Radio size={15} />
              <span>Stations</span>
              <ChevronUp size={15} className={`transition-transform duration-200 ${stationOpen ? '' : 'rotate-180'}`} />
            </button>

            {stationOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStationOpen(false)} />
                <div className="glass-card py-1 shadow-2xl z-50" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.5rem', width: '17rem' }}>
                  {stations.map(s => (
                    <button key={s.id}
                      onClick={() => { selectStation(s); setStationOpen(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#2c3138] ${
                        current.id === s.id ? 'text-[#e8a020]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                      }`}>
                      <Radio size={13} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-[#484f58] truncate">{s.genre}</p>
                      </div>
                      {current.id === s.id && isPlaying && (
                        <span className="w-2 h-2 rounded-full bg-[#e8a020] animate-pulse shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Volume */}
        <button onClick={toggleMute}
          className="text-[#8b949e] hover:text-[#e6edf3] transition-colors shrink-0">
          {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input type="range" min="0" max="1" step="0.01"
          value={muted ? 0 : volume}
          onChange={e => setVolumeValue(parseFloat(e.target.value))}
          className="volume-slider w-36 shrink-0" />
      </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <RadioProvider>
        <div className="min-h-screen flex flex-col bg-[#181c20] text-[#e6edf3]">
          <Navbar />
          <SpacebarToggle />
          <main className="flex-1 flex flex-col pb-24">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          <FooterPlayer />
        </div>
      </RadioProvider>
    </AuthProvider>
  )
}
