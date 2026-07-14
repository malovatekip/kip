/**
 * KipBackground — Living Animated Background
 * ==========================================
 * Three colour blobs (blue, gold, copper) drifting very slowly behind
 * the entire app. Colours are at 5–7% opacity — felt but not consciously
 * noticed. This is the "alive" quality Paul described.
 *
 * The blobs use CSS animations rather than JS to keep performance high.
 * Each blob has a different duration (18s, 22s, 26s) so they never
 * sync up and create an organic, never-repeating pattern.
 *
 * In light mode: very subtle colour washes over the off-white base.
 * In dark mode: slightly more visible, still restrained.
 *
 * Usage: Place ONCE inside Layout.jsx, behind everything else.
 *   <KipBackground />
 *   <div className="app-content">...</div>
 */

import React from 'react'

export default function KipBackground() {
  return (
    <>
      <style>{`
        .kip-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        /* ── Blob base styles ─────────────────────────────────── */
        .kip-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          mix-blend-mode: multiply;
          will-change: transform;
        }

        [data-theme="dark"] .kip-blob {
          mix-blend-mode: screen;
        }

        /* ── Blue blob — Intelligence ─────────────────────────── */
        .kip-blob-blue {
          width: 70vw;
          height: 70vw;
          max-width: 900px;
          max-height: 900px;
          background: radial-gradient(circle, rgba(26,108,240,0.07) 0%, transparent 70%);
          top: -20%;
          left: -15%;
          animation: driftBlue 22s ease-in-out infinite;
        }

        @keyframes driftBlue {
          0%   { transform: translate(0,    0)    scale(1.0);  }
          25%  { transform: translate(8%,   5%)   scale(1.05); }
          50%  { transform: translate(12%,  -3%)  scale(0.97); }
          75%  { transform: translate(4%,   -8%)  scale(1.03); }
          100% { transform: translate(0,    0)    scale(1.0);  }
        }

        /* ── Gold blob — Opportunity ──────────────────────────── */
        .kip-blob-gold {
          width: 60vw;
          height: 60vw;
          max-width: 780px;
          max-height: 780px;
          background: radial-gradient(circle, rgba(200,118,58,0.06) 0%, transparent 70%);
          bottom: -10%;
          right: -5%;
          animation: driftGold 18s ease-in-out infinite;
        }

        @keyframes driftGold {
          0%   { transform: translate(0,    0)    scale(1.0);  }
          33%  { transform: translate(-6%,  -8%)  scale(1.08); }
          66%  { transform: translate(-10%, 4%)   scale(0.95); }
          100% { transform: translate(0,    0)    scale(1.0);  }
        }

        /* ── Copper blob — African Entrepreneurship ───────────── */
        .kip-blob-copper {
          width: 50vw;
          height: 50vw;
          max-width: 650px;
          max-height: 650px;
          background: radial-gradient(circle, rgba(160,82,45,0.05) 0%, transparent 70%);
          top: 30%;
          right: 20%;
          animation: driftCopper 26s ease-in-out infinite;
        }

        @keyframes driftCopper {
          0%   { transform: translate(0,    0)    scale(1.0);  }
          20%  { transform: translate(-5%,  6%)   scale(1.06); }
          40%  { transform: translate(6%,   10%)  scale(0.98); }
          60%  { transform: translate(8%,   -4%)  scale(1.04); }
          80%  { transform: translate(-3%,  -7%)  scale(0.97); }
          100% { transform: translate(0,    0)    scale(1.0);  }
        }

        /* ── White glow — centre warmth ───────────────────────── */
        .kip-blob-glow {
          width: 40vw;
          height: 40vw;
          max-width: 500px;
          max-height: 500px;
          background: radial-gradient(circle, rgba(255,255,255,0.60) 0%, transparent 65%);
          top: 15%;
          left: 35%;
          animation: driftGlow 30s ease-in-out infinite;
          mix-blend-mode: overlay;
        }

        [data-theme="dark"] .kip-blob-glow {
          opacity: 0.15;
        }

        @keyframes driftGlow {
          0%   { transform: translate(0, 0) scale(1.0); }
          50%  { transform: translate(3%, -5%) scale(1.1); }
          100% { transform: translate(0, 0) scale(1.0); }
        }
      `}</style>

      <div className="kip-bg" aria-hidden="true">
        <div className="kip-blob kip-blob-blue"   />
        <div className="kip-blob kip-blob-gold"   />
        <div className="kip-blob kip-blob-copper" />
        <div className="kip-blob kip-blob-glow"   />
      </div>
    </>
  )
}
