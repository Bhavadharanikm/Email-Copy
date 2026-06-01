/**
 * BackgroundGlow
 * Combines a soft yellow centre glow + warm orange top-right glow.
 * Drop this as the first child inside any full-height container.
 */
export function BackgroundGlow() {
  return (
    <>
      {/* Soft yellow glow — centre */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 40%, #FFF176 0%, transparent 68%)',
          opacity: 0.7,
        }}
      />

      {/* Warm orange glow — top right */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 90% 5%, rgba(255,140,60,0.55), transparent 55%)',
          filter: 'blur(60px)',
        }}
      />
    </>
  )
}

export default BackgroundGlow
