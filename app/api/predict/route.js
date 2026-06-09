// POST /api/predict
// Saves a prediction. Enforces:
//   - One prediction per user per match
//   - Cannot predict after kickoff

import { NextResponse } from 'next/server'
import { supabase }     from '@/lib/supabase'

export async function POST(request) {
  try {
    const { userId, matchId, homeGoals, awayGoals } = await request.json()

    // Validate inputs
    if (!userId || !matchId || homeGoals == null || awayGoals == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (homeGoals < 0 || awayGoals < 0 || homeGoals > 20 || awayGoals > 20) {
      return NextResponse.json({ error: 'Invalid scoreline' }, { status: 400 })
    }

    // Check match exists and hasn't started
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, status, kickoff_time, home_team, away_team')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.status === 'live' || match.status === 'done') {
      return NextResponse.json({ error: 'Predictions are locked — match has started' }, { status: 403 })
    }

    // Double-check kickoff time server-side (safety net)
    if (new Date(match.kickoff_time) <= new Date()) {
      return NextResponse.json({ error: 'Predictions are locked — match has started' }, { status: 403 })
    }

    // Check if prediction already exists (unique constraint)
    const { data: existing } = await supabase
      .from('predictions')
      .select('id, submitted_at')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'You already predicted this match. Predictions are immutable.',
        submittedAt: existing.submitted_at
      }, { status: 409 })
    }

    // Insert prediction (immutable — no update route exists)
    const { data, error } = await supabase
      .from('predictions')
      .insert({
        user_id:    userId,
        match_id:   matchId,
        home_goals: homeGoals,
        away_goals: awayGoals,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, prediction: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
