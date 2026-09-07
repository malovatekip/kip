import React from 'react'
import KIP_LOGO from '../kipLogo'

/**
 * KipThinking
 * ───────────
 * Replaces the old "KIP is thinking..." text + dots indicator. A rotating
 * blue→teal ring (the same gradient used on every KIP avatar/brand accent)
 * orbits the real KIP logo, which breathes with the same glow used on the
 * logo everywhere else in the app (see .animate-logo-glow in index.css).
 * Purely visual — no text needed, so it reads the same in every language.
 */
export default function KipThinking({ size = 30 }) {
  return (
    <div
      className="kip-thinking"
      role="status"
      aria-live="polite"
      aria-label="KIP is generating a response"
      style={{ width: size, height: size }}
    >
      <img src={KIP_LOGO} alt="" className="kip-thinking-logo" />
    </div>
  )
}
