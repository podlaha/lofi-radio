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
    <div className="z-40 border-t border-[#30363d] bg-[rgba(13,17,23,0.85)] nav-blur" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%' }}>
      <div className="py-3 flex justify-center">
      <div className="flex items-center gap-6 w-full" style={{ maxWidth: '680px', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>

        {/* Mini vinyl */}
        <div className={`w-9 h-9 rounded-full shrink-0 ${isPlaying ? 'vinyl-spin' : ''}`} style={{ background: 'radial-gradient(circle, #ff6600 0%, #ff6600 16%, #ff9900 17%, #ff9900 20%, #ffcc00 21%, #ff9900 26%, #ffcc00 27%, #ff9900 32%, #ffcc00 33%, #ff9900 38%, #ffcc00 39%, #ff9900 44%, #ff6600 45%, #ff3300 100%)', boxShadow: '0 0 0 1.5px #ff6600' }} />

        {/* Play / pause */}
        <button onClick={togglePlay}
          className="text-[#8b949e] hover:text-[#e8a020] transition-colors shrink-0">
          {buffering
            ? <Loader size={18} className="animate-spin text-[#e8a020]" />
            : isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
        </button>

        {/* Station name + live dot */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-[#e8a020] animate-pulse shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#e6edf3] truncate leading-tight">{current.name}</p>
            <p className="text-xs text-[#484f58] leading-tight">{current.genre}</p>
          </div>
        </div>

        {/* Station selector */}
        {stations.length > 0 && (
          <div className="relative shrink-0">
            <button onClick={() => setStationOpen(p => !p)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#2c3138] hover:border-[#e8a020]/40 text-[#8b949e] hover:text-[#e6edf3] text-sm transition-all duration-200">
              <Radio size={13} />
              <span>Stations</span>
              <ChevronUp size={13} className={`transition-transform duration-200 ${stationOpen ? '' : 'rotate-180'}`} />
            </button>

            {stationOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStationOpen(false)} />
                <div className="glass-card py-1 shadow-2xl z-50" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.5rem', width: '14rem' }}>
                  {stations.map(s => (
                    <button key={s.id}
                      onClick={() => { selectStation(s); setStationOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#2c3138] ${
                        current.id === s.id ? 'text-[#e8a020]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                      }`}>
                      <Radio size={11} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-[10px] text-[#484f58] truncate">{s.genre}</p>
                      </div>
                      {current.id === s.id && isPlaying && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e8a020] animate-pulse shrink-0" />
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
          {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input type="range" min="0" max="1" step="0.01"
          value={muted ? 0 : volume}
          onChange={e => setVolumeValue(parseFloat(e.target.value))}
          className="volume-slider w-28 shrink-0" />
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
          <main className="flex-1 flex flex-col pb-14">
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
