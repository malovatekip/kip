// Singleton Tone.js audio module — not a rendered component. Kept as .jsx to
// match the spec's literal filename. Synths are created once, lazily, on first
// use and reused via .triggerAttackRelease() — never re-instantiated per call.
import * as Tone from 'tone'

let synths = null

function ensureInit() {
  if (synths) return synths
  synths = {
    kaChing:  new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination(),
    buzzer:   new Tone.FMSynth().toDestination(),
    ambience: new Tone.PolySynth(Tone.Synth).toDestination(),
    resolve:  new Tone.Synth().toDestination(),
    pulse:    new Tone.Synth().toDestination(),
    sparkle:  new Tone.Synth().toDestination(),
    chime:    new Tone.Synth().toDestination(),
    fanfare:  new Tone.PolySynth(Tone.Synth).toDestination(),
    arpeggio: new Tone.Synth().toDestination(),
  }
  return synths
}

const GameAudio = {
  // Must be called from a user-gesture handler (browsers block AudioContext
  // until interaction). Idempotent — safe to call on every gesture.
  init() {
    if (Tone.context.state !== 'running') {
      Tone.start().catch(() => {})
    }
    ensureInit()
  },

  // ── Sprint 1: wired up in DayCanvas.jsx ─────────────────────────────────
  saleKaChing(amount = 50) {
    const s = ensureInit()
    const oct = amount > 300 ? 6 : amount > 100 ? 5 : 4
    s.kaChing.triggerAttackRelease(`C${oct}`, '32n')
    setTimeout(() => s.kaChing.triggerAttackRelease(`E${oct}`, '32n'), 16)
  },
  customerWalkAway() {
    const s = ensureInit()
    s.buzzer.triggerAttackRelease('F3', '8n')
    setTimeout(() => s.buzzer.triggerAttackRelease('D3', '8n'), 100)
  },
  dayStart() {
    const s = ensureInit()
    s.ambience.triggerAttackRelease(['C4', 'E4', 'G4', 'B4'], '2n')
  },
  dayProfitable() {
    const s = ensureInit()
    ;['C4', 'E4', 'G4', 'C5'].forEach((n, i) => setTimeout(() => s.resolve.triggerAttackRelease(n, '8n'), i * 120))
  },
  dayLoss() {
    const s = ensureInit()
    ;['G4', 'F4', 'D4', 'B3'].forEach((n, i) => setTimeout(() => s.resolve.triggerAttackRelease(n, '8n'), i * 140))
  },

  // ── Built now, wired up in later sprints (debt UI, upgrades, rival NPC
  // moments, missions toast, bankruptcy screen) — cheap to have ready. ─────
  debtWarning() {
    const s = ensureInit()
    ;[0, 300, 600].forEach(t => setTimeout(() => s.pulse.triggerAttackRelease('D4', '16n'), t))
  },
  upgradePurchased() {
    const s = ensureInit()
    s.sparkle.triggerAttackRelease('C6', '16n')
    setTimeout(() => s.sparkle.triggerAttackRelease('E6', '16n'), 80)
  },
  rivalAppears() {
    const s = ensureInit()
    s.chime.triggerAttackRelease('C5', '16n')
    setTimeout(() => s.chime.triggerAttackRelease('G5', '16n'), 90)
  },
  missionComplete() {
    const s = ensureInit()
    ;['C4', 'E4', 'G4', 'C5'].forEach((n, i) => setTimeout(() => s.fanfare.triggerAttackRelease(n, '4n'), i * 200))
  },
  gameOver() {
    const s = ensureInit()
    ;['C4', 'A3', 'F3', 'D3'].forEach((n, i) => setTimeout(() => s.arpeggio.triggerAttackRelease(n, '2n'), i * 300))
  },
}

export default GameAudio
