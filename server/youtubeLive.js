// Keeps a station's youtube_url pointed at whatever video is *currently*
// live on its YouTube channel, for channels (like 24/7 lofi streams) whose
// live video ID changes every time the broadcaster restarts the stream.
//
// How it works: YouTube channels expose a "shortcut" URL —
// youtube.com/channel/<id>/live (or youtube.com/<@handle>/live) — that
// resolves to whatever video is currently live on that channel. From most
// server IPs it 30x-redirects straight to the /watch URL; from an EU IP it
// instead serves the channel page directly (HTTP 200, after bouncing through
// a cookie-consent interstitial) with the live video named in its
// <link rel="canonical"> tag. We handle both: follow redirects, and if we
// land on a plain page instead of a /watch URL, read the canonical tag.
// No API key or quota needed either way.

import { getAllStations, updateStation } from './db.js'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  // Pre-accepted cookie-consent choice, so the request doesn't dead-end on
  // YouTube's EU consent wall instead of reaching the channel/video page.
  'Cookie': 'CONSENT=YES+1',
}

function liveShortcutUrl(channelIdOrHandle) {
  return channelIdOrHandle.startsWith('@')
    ? `https://www.youtube.com/${channelIdOrHandle}/live`
    : `https://www.youtube.com/channel/${channelIdOrHandle}/live`
}

async function resolveLiveVideoId(channelIdOrHandle) {
  const res = await fetch(liveShortcutUrl(channelIdOrHandle), {
    redirect: 'follow',
    headers: FETCH_HEADERS,
  })

  // Case 1: redirected straight to the watch URL.
  let match = res.url.match(/[?&]v=([\w-]{11})/)
  if (match) return match[1]

  // Case 2: landed on the channel page itself - read the canonical link,
  // which YouTube points at the currently-live video for that channel.
  const html = await res.text()
  match = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)
  return match ? match[1] : null
}

async function refreshStation(station) {
  const channelId = station.youtube_channel_id?.trim()
  if (!channelId) return
  try {
    const videoId = await resolveLiveVideoId(channelId)
    if (!videoId) {
      console.log(`[youtube-live] "${station.name}": no live video found for ${channelId} right now.`)
      return
    }
    const newUrl = `https://www.youtube.com/watch?v=${videoId}`
    if (newUrl !== station.youtube_url) {
      updateStation(station.id, { youtube_url: newUrl })
      console.log(`[youtube-live] "${station.name}": updated youtube_url -> ${newUrl}`)
    }
  } catch (err) {
    console.error(`[youtube-live] "${station.name}": refresh failed —`, err.message)
  }
}

async function refreshAll() {
  const stations = getAllStations().filter(s => s.youtube_channel_id?.trim())
  for (const station of stations) {
    await refreshStation(station)
  }
}

export function startLiveRefresh() {
  refreshAll()
  setInterval(refreshAll, REFRESH_INTERVAL_MS)
}
