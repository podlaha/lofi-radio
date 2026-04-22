import { createContext, useContext, useRef, useState, useEffect } from 'react'
import Hls from 'hls.js'

const RadioContext = createContext(null)

export function RadioProvider({ children }) {
  const audioRef = useRef(null)
  const hlsRef = useRef(null)
  const urlIndexRef = useRef(0)
  const activeUrlsRef = useRef([])

  const [stations, setStations] = useState([])
  const [current, setCurrent] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [muted, setMuted] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [loaded, setLoaded] = useState(false)

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
        // stay in buffering state
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

  async function _startStream(station, vol, isMuted) {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.volume = isMuted ? 0 : vol
    setBuffering(true)
    setIsPlaying(true)

    let urls
    if (station.youtube_url) {
      try {
        const res = await fetch(`/api/stations/${station.id}/stream-url`)
        if (!res.ok) throw new Error()
        const { url } = await res.json()
        urls = [url]
      } catch {
        setBuffering(false)
        setIsPlaying(false)
        return
      }
    } else {
      urls = station.stream_urls?.length ? station.stream_urls : [station.stream_url]
    }

    activeUrlsRef.current = urls
    urlIndexRef.current = 0

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

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

  function play() {
    if (!current) return
    _startStream(current, volume, muted)
  }

  function pause() {
    const audio = audioRef.current
    if (!audio) return
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    audio.pause()
    audio.src = ''
    activeUrlsRef.current = []
    setIsPlaying(false)
    setBuffering(false)
  }

  function togglePlay() {
    if (isPlaying) pause()
    else play()
  }

  function selectStation(station) {
    setCurrent(station)
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.src = '' }
    _startStream(station, volume, muted)
  }

  function setVolumeValue(v) {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    if (muted && v > 0) setMuted(false)
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    const next = !muted
    setMuted(next)
    audio.volume = next ? 0 : volume
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
