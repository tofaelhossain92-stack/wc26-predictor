const ONESIGNAL_API = 'https://onesignal.com/api/v1/notifications'

// Send a push notification to all subscribers
export async function sendPush({ title, message, url = '/' }) {
  const payload = {
    app_id:            process.env.ONESIGNAL_REST_API_KEY ? undefined : null, // handled below
    included_segments: ['All'],
    headings:          { en: title },
    contents:          { en: message },
    url,
    chrome_web_icon:   '/icon-192.png',
  }

  const res = await fetch(ONESIGNAL_API, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      ...payload,
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('OneSignal error:', err)
    return false
  }
  return true
}

// Notify 30 min before a match
export async function notifyMatchSoon(homeTeam, awayTeam, homeFlag, awayFlag) {
  return sendPush({
    title:   '⚽ Match Starting Soon!',
    message: `${homeFlag} ${homeTeam} vs ${awayTeam} ${awayFlag} kicks off in 30 minutes — lock in your prediction!`,
    url:     '/game',
  })
}

// Notify when result is in and points are updated
export async function notifyResultIn(homeTeam, awayTeam, homeGoals, awayGoals, homeFlag, awayFlag) {
  return sendPush({
    title:   '🏁 Match Result Is In!',
    message: `${homeFlag} ${homeTeam} ${homeGoals} – ${awayGoals} ${awayTeam} ${awayFlag} · Check your points on the leaderboard!`,
    url:     '/game?tab=leaderboard',
  })
}
