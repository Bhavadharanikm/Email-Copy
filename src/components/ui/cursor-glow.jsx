import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const glowRef = useRef(null)
  const pos = useRef({ x: -400, y: -400 })
  const current = useRef({ x: -400, y: -400 })
  const raf = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)

    const animate = () => {
      // Smooth lerp — adjust 0.08 for slower/faster follow
      current.current.x += (pos.current.x - current.current.x) * 0.08
      current.current.y += (pos.current.y - current.current.y) * 0.08

      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`
      }
      raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          top: -300,
          left: -300,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.06) 40%, transparent 70%)',
          willChange: 'transform',
          filter: 'blur(8px)',
        }}
      />
    </div>
  )
}

export default CursorGlow
