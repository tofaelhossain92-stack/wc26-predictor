// POST /api/users → create or find a user by name

import { NextResponse } from 'next/server'
import { supabase }     from '@/lib/supabase'

export async function POST(request) {
  try {
    const { name, avatar } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const cleanName = name.trim().substring(0, 30)

    // Try to find existing user (case-insensitive)
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanName)
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, user: existing, isNew: false })
    }

    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert({ name: cleanName, avatar: avatar || '⚽' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, user: data, isNew: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
