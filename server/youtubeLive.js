// Keeps a station's youtube_url pointed at whatever video is *currently*
// live on its YouTube channel, for channels (like 24/7 lofi streams) whose
// live video ID changes every time the broadcaster restarts the stream.
//
// Two resolution modes, picked per-station:
//
// 1. Plain channel mode (youtube_channel_id only): follows the channel's
//    "shortcut" URL - youtube.com/channel/<id>/live (or youtube.com/<@handle>/live)
//    - which resolves to whatever YouTube treats as that channel's one
//    "primary" live video. From most server IPs it 30x-redirects straight to
//    the /watch URL; from an EU IP it instead serves the channel page
//    directly (HTTP 200, after bouncing through a cookie-consent
//    interstitial) with the live video named in its <link rel="canonical">
//    tag. We handle both. This only works when a channel has (at most) one
//    live video it treats as primary.
//
// 2. Title-match mode (youtube_channel_id + youtube_title_match): for
//    channels that run several simultaneous live streams (e.g. Lofi Girl
//    runs a lofi stream, a synthwave stream, a seasonal stream, etc. all at
//    once), the "primary" slot isn't necessarily the one you want. Instead
//    we fetch the channel's /streams page, find every video tile's title,
//    and pick the one whose title contains youtube_title_match (diacritics/
//    emoji-insensitive). Titles get reused across different video IDs over
//    the channel's history though (an old, long-ended broadcast can have the
//    exact same title as today's), so a title match alone isn't enough - we
//    then confirm the candidate is *actually* live right now by checking its
//    own watch page's liveBroadcastDetails.isLiveNow before accepting it.
//
// No API key or quota needed for either mode.

import { getAllStations, updateStation } from './db.js'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  // Pre-accepted cookie-consent choice, so the request doesn't dead-end on
  // YouTube's EU consent wall instead of reaching the channel/video page.
  'Cookie': 'CONSENT=YES+1',
}

function channelBaseUrl(channelIdOrHandle) {
  return channelIdOrHandle.startsWith('@')
    ? `https://www.youtube.com/${channelIdOrHandle}`
    : `https://www.youtube.com/channel/${channelIdOrHandle}`
}

// Strips emoji/symbols and normalizes whitespace/case, so a configured match
// string doesn't have to exactly reproduce whatever emoji YouTube currently
// puts in the title (and matching still works if that emoji ever changes).
function normalizeTitle(str) {
  return str
    .replace(/[^\p{L}\p{N}\s/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

async function resolveByChannelPrimary(channelIdOrHandle) {
  const res = await fetch(`${channelBaseUrl(channelIdOrHandle)}/live`, {
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

// Returns true if the given video's own watch page reports it as live right
// now (distinguishes a currently-live broadcast from an old, ended one that
// happens to share the same title).
async function isCurrentlyLive(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    redirect: 'follow',
    headers: FETCH_HEADERS,
  })
  const html = await res.text()
  const match = html.match(/"liveBroadcastDetails":\{"isLiveNow":(true|false)/)
  return match ? match[1] === 'true' : false
}

async function resolveByTitleMatch(channelIdOrHandle, titleMatch) {
  const res = await fetch(`${channelBaseUrl(channelIdOrHandle)}/streams`, {
    redirect: 'follow',
    headers: FETCH_HEADERS,
  })
  const html = await res.text()
  const needle = normalizeTitle(titleMatch)

  // Every video tile on the page looks like:
  //   ...,"contentId":"<videoId>", ... ,"metadata":{"lockupMetadataViewModel":
  //   {"title":{"content":"<title>"
  // i.e. the contentId comes *before* the title within the same tile, so for
  // each matching title we scan backwards for its nearest preceding contentId.
  const titleRe = /"lockupMetadataViewModel":\{"title":\{"content":"([^"]+)"/g
  const candidates = []
  for (const m of html.matchAll(titleRe)) {
    if (!normalizeTitle(m[1]).includes(needle)) continue
    const beforeTitle = html.slice(0, m.index)
    const idMatch = [...beforeTitle.matchAll(/"contentId":"([\w-]{11})"/g)].pop()
    if (idMatch) candidates.push({ videoId: idMatch[1], title: m[1] })
  }

  // Multiple candidates can share this title (old ended broadcasts reuse
  // titles) - take the first one that's actually live right now.
  for (const { videoId, title } of candidates) {
    if (await isCurrentlyLive(videoId)) return { videoId, title }
  }
  return null
}

async function refreshStation(station) {
  const channelId = station.youtube_channel_id?.trim()
  if (!channelId) return
  const titleMatch = station.youtube_title_match?.trim()

  try {
    let videoId
    if (titleMatch) {
      const found = await resolveByTitleMatch(channelId, titleMatch)
      if (!found) {
        console.log(`[youtube-live] "${station.name}": no live video on ${channelId} currently matches title "${titleMatch}".`)
        return
      }
      videoId = found.videoId
    } else {
      videoId = await resolveByChannelPrimary(channelId)
      if (!videoId) {
        console.log(`[youtube-live] "${station.name}": no live video found for ${channelId} right now.`)
        return
      }
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
