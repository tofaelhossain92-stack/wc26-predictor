// Reusable background component with footballer silhouettes
export default function PitchBackground() {
  const silhouettes = [
    // [file, x%, y%, size, opacity, rotation, flipX]
    { file: '/silhouettes/celebrate.svg',    x: 4,  y: 8,  size: 220, opacity: 0.055, rotate: -5,  flip: false },
    { file: '/silhouettes/bicycle-kick.svg', x: 72, y: 2,  size: 180, opacity: 0.045, rotate: 8,   flip: true  },
    { file: '/silhouettes/freekick.svg',     x: 82, y: 48, size: 240, opacity: 0.05,  rotate: -3,  flip: false },
    { file: '/silhouettes/dribble.svg',      x: 2,  y: 55, size: 200, opacity: 0.05,  rotate: 4,   flip: false },
    { file: '/silhouettes/goalkeeper.svg',   x: 20, y: 78, size: 280, opacity: 0.04,  rotate: 0,   flip: false },
    { file: '/silhouettes/celebrate.svg',    x: 58, y: 72, size: 160, opacity: 0.04,  rotate: 10,  flip: true  },
    { file: '/silhouettes/bicycle-kick.svg', x: 38, y: 15, size: 140, opacity: 0.035, rotate: -12, flip: false },
  ]

  return (
    <>
      {/* Pitch grid lines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: 0.035,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 60px, #00ff44 60px, #00ff44 61px),
          repeating-linear-gradient(90deg, transparent, transparent 60px, #00ff44 60px, #00ff44 61px)
        `,
      }} />

      {/* Center circle */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500, height: 500, borderRadius: '50%',
        border: '1px solid rgba(0,255,68,0.04)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Footballer silhouettes */}
      {silhouettes.map((s, i) => (
        <div key={i} style={{
          position: 'fixed',
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size,
          opacity: s.opacity,
          pointerEvents: 'none',
          zIndex: 0,
          transform: `rotate(${s.rotate}deg) scaleX(${s.flip ? -1 : 1})`,
          filter: 'blur(0.5px)',
          transformOrigin: 'center bottom',
        }}>
          <img
            src={s.file}
            alt=""
            style={{ width: '100%', height: 'auto', display: 'block', filter: 'brightness(10)' }}
          />
        </div>
      ))}
    </>
  )
}
