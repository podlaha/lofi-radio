import { createContext, useContext, useRef, useState, useEffect } from 'react'
import Hls from 'hls.js'

const RadioContext = createContext(null)

const clamp01 = (n) => Math.min(1, Math.max(0, n))

// Perceived loudness follows a power law, so a linear slider makes almost all of
// the audible change happen in the bottom third of its travel. Map the linear
// slider position to an "audio taper" gain curve (like Spotify/SoundCloud) so the
// perceived change is spread evenly across the slider — giving much finer control
// at low volumes. Higher exponent = more resolution down low. `volume` state stays
// the linear 0..1 slider position; this is applied only when setting actual gain.
const VOLUME_CURVE = 2.5
const toGain = (position) => Math.pow(clamp01(position), VOLUME_CURVE)

function getYouTubeId(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {}
  return null
}

export function RadioProvider({ children }) {
  const audioRef = useRef(null)
  const hlsRef = useRef(null)
  const urlIndexRef = useRef(0)
  const activeUrlsRef = useRef([])
  const ytPlayerRef = useRef(null)
  const ytApiReadyRef = useRef(false)
  const pendingVideoIdRef = useRef(null)

  const [stations, setStations] = useState([])
  const [current, setCurrent] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [muted, setMuted] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const div = document.createElement('div')
    div.id = 'yt-player'
    div.style.cssText = 'position:fixed;bottom:-2px;right:-2px;width:1px;height:1px;pointer-events:none;'
    document.body.appendChild(div)

    window.onYouTubeIframeAPIReady = () => {
      ytApiReadyRef.current = true
      if (pendingVideoIdRef.current) {
        _doPlayYT(pendingVideoIdRef.current)
        pendingVideoIdRef.current = null
      }
    }
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    } else {
      ytApiReadyRef.current = true
    }

    return () => {
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy() } catch {} }
      if (document.body.contains(div)) document.body.removeChild(div)
    }
  }, [])

  useEffect(() => {
    fetch('/api/stations')
      .then(r => r.json())
      .then(data => {
        setStations(data)
        if (data.length > 0) setCurrent(data[0])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)
    const onError = () => {
      const urls = activeUrlsRef.current
      const next = urlIndexRef.current + 1
      if (next < urls.length) {
        urlIndexRef.current = next
        audio.src = urls[next]
        audio.play().catch(() => {})
      } else {
        setBuffering(false)
        setIsPlaying(false)
      }
    }
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('error', onError)
    }
  }, [])

  function _doPlayYT(videoId) {
    const volInt = muted ? 0 : Math.round(toGain(volume) * 100)
    if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
      ytPlayerRef.current.loadVideoById(videoId)
      ytPlayerRef.current.setVolume(volInt)
    } else {
      ytPlayerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, modestbranding: 1 },
        events: {
          onReady: (e) => { e.target.setVolume(volInt); e.target.playVideo() },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING)  { setIsPlaying(true);  setBuffering(false) }
            if (e.data === window.YT.PlayerState.BUFFERING) { setIsPlaying(true);  setBuffering(true)  }
            if (e.data === window.YT.PlayerState.PAUSED)   { setIsPlaying(false); setBuffering(false) }
            if (e.data === window.YT.PlayerState.ENDED)    { setIsPlaying(false); setBuffering(false) }
          },
          onError: () => { setBuffering(false); setIsPlaying(false) },
        },
      })
    }
  }

  function _stopYT() {
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.pauseVideo() } catch {}
    }
  }

  function _stopAudio() {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = ''
    activeUrlsRef.current = []
  }

  function _startStream(station, vol, isMuted) {
    const videoId = getYouTubeId(station.youtube_url)

    if (videoId) {
      _stopAudio()
      setBuffering(true)
      setIsPlaying(true)
      if (!ytApiReadyRef.current) {
        pendingVideoIdRef.current = videoId
      } else {
        _doPlayYT(videoId)
      }
    } else {
      _stopYT()
      const urls = station.stream_urls?.length ? station.stream_urls : (station.stream_url ? [station.stream_url] : [])
      if (!urls.length) return
      const audio = audioRef.current
      if (!audio) return
      audio.volume = isMuted ? 0 : toGain(vol)
      setBuffering(true)
      setIsPlaying(true)
      activeUrlsRef.current = urls
      urlIndexRef.current = 0
      const url = urls[0]
      if (url.includes('.m3u8') && Hls.isSupported()) {
        const hls = new Hls()
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(audio)
        hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play().catch(() => {}))
        hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) { hls.destroy(); hlsRef.current = null } })
      } else {
        audio.src = url
        audio.play().catch(() => {})
      }
    }
  }

  function play() { if (current) _startStream(current, volume, muted) }

  function pause() {
    const videoId = current && getYouTubeId(current.youtube_url)
    if (videoId) _stopYT(); else _stopAudio()
    setIsPlaying(false)
    setBuffering(false)
  }

  function togglePlay() { if (isPlaying) pause(); else play() }

  function selectStation(station) {
    setCurrent(station)
    _stopAudio()
    _stopYT()
    _startStream(station, volume, muted)
  }

  function setVolumeValue(v) {
    const pos = clamp01(v)
    setVolume(pos)
    if (audioRef.current) audioRef.current.volume = toGain(pos)
    if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(Math.round(toGain(pos) * 100))
    if (muted && pos > 0) setMuted(false)
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    if (audioRef.current) audioRef.current.volume = next ? 0 : toGain(volume)
    if (ytPlayerRef.current) {
      try { next ? ytPlayerRef.current.mute() : (ytPlayerRef.current.unMute(), ytPlayerRef.current.setVolume(Math.round(toGain(volume) * 100))) } catch {}
    }
  }

  return (
    <RadioContext.Provider value={{
      stations, current, isPlaying, volume, muted, buffering, loaded,
      togglePlay, selectStation, setVolumeValue, toggleMute,
    }}>
      <audio ref={audioRef} preload="none" />
      {children}
    </RadioContext.Provider>
  )
}

export const useRadio = () => useContext(RadioContext)
