import { Suspense } from 'react'
import GameClient from './GameClient'

export default function GamePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Loading...</div>
      </div>
    }>
      <GameClient />
    </Suspense>
  )
}
