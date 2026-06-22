// Shared group stage standings calculator
// Used by both Standings.jsx and MatchPredictor.jsx

export const VALID_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export const GROUP_TEAMS = {
  A: ['Mexico','Korea Republic','Czechia','South Africa'],
  B: ['Canada','Bosnia & Herz.','Qatar','Switzerland'],
  C: ['Brazil','Morocco','Haiti','Scotland'],
  D: ['USA','Paraguay','Australia','Türkiye'],
  E: ['Germany','Curaçao',"Côte d'Ivoire",'Ecuador'],
  F: ['Netherlands','Japan','Sweden','Tunisia'],
  G: ['Belgium','Egypt','IR Iran','New Zealand'],
  H: ['Spain','Cabo Verde','Saudi Arabia','Uruguay'],
  I: ['France','Senegal','Iraq','Norway'],
  J: ['Argentina','Algeria','Austria','Jordan'],
  K: ['Portugal','Congo DR','Uzbekistan','Colombia'],
  L: ['England','Croatia','Ghana','Panama'],
}

export function calcStandings(matches) {
  const teamMap = {}
  const addTeam = (name, flag, group) => {
    const key = `${group}-${name}`
    if (!teamMap[key]) {
      teamMap[key] = { name, flag, group, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    }
    return teamMap[key]
  }

  matches
    .filter(m => m.status === 'done' && m.home_goals != null && m.group_name && VALID_GROUPS.includes(m.group_name))
    .forEach(m => {
      const home = addTeam(m.home_team, m.home_flag, m.group_name)
      const away = addTeam(m.away_team, m.away_flag, m.group_name)
      home.mp++; away.mp++
      home.gf += m.home_goals; home.ga += m.away_goals
      away.gf += m.away_goals; away.ga += m.home_goals
      if (m.home_goals > m.away_goals) { home.w++; home.pts += 3; away.l++ }
      else if (m.home_goals < m.away_goals) { away.w++; away.pts += 3; home.l++ }
      else { home.d++; home.pts++; away.d++; away.pts++ }
      home.gd = home.gf - home.ga
      away.gd = away.gf - away.ga
    })

  matches.filter(m => m.group_name && VALID_GROUPS.includes(m.group_name)).forEach(m => {
    if (!m.home_team || m.home_team.startsWith('TBD')) return
    if (!m.away_team || m.away_team.startsWith('TBD')) return
    addTeam(m.home_team, m.home_flag, m.group_name)
    addTeam(m.away_team, m.away_flag, m.group_name)
  })

  const groups = {}
  Object.values(teamMap).forEach(team => {
    if (!groups[team.group]) groups[team.group] = []
    if (!groups[team.group].find(t => t.name === team.name)) groups[team.group].push(team)
  })

  Object.keys(groups).forEach(g => {
    groups[g] = groups[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf).slice(0, 4)
  })

  // Build a flat lookup: team name -> { position, pts, group, qualified }
  const teamPosition = {}
  Object.keys(groups).forEach(g => {
    const allPlayed = groups[g].every(t => t.mp >= 3)
    groups[g].forEach((team, i) => {
      teamPosition[team.name] = {
        position: i + 1,
        pts: team.pts,
        group: g,
        qualified: allPlayed && i < 2,
      }
    })
  })

  return { groups, teamPosition }
}
