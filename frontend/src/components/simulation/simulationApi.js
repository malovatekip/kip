import api from '../../lib/api'
import demoSession from './demoSession.json'

const clone = (x) => JSON.parse(JSON.stringify(x))

/**
 * Data source for the dashboard.
 *  real: the /api/simulation session endpoints (resume an unfinished run, else start one)
 *  demo: replays demoSession.json — a session recorded from the real engine —
 *        so the UI can be viewed with only the frontend running (dev only).
 */
export function makeSimulationApi(ideaId, { demo = false } = {}) {
  if (demo) {
    let played = 0
    const final = demoSession.plays[demoSession.plays.length - 1].session
    const pastRow = {
      session_id: -1, status: 'completed', horizon_weeks: final.horizon_weeks, current_week: final.horizon_weeks,
      created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
      viability_simulated: final.running_viability - 0.31, viability_baseline: final.viability_baseline,
      ending_cash: final.economics.cash * 0.72, initial_cash: final.economics.initial_cash,
    }
    return {
      demo: true,
      async load() { played = 0; return { session: clone(demoSession.start), past: [pastRow] } },
      async play() {
        const p = demoSession.plays[played]
        if (!p) throw new Error('Demo replay finished')
        played += 1
        return { week: clone(p.week), session: clone(p.session), recordedLevers: clone(p.levers) }
      },
      async restart() { played = 0; return clone(demoSession.start) },
      async past() { return [pastRow] },
      // No backend in demo: fall back to the week's rule-based advice.
      async advice() { return null },
      // Demo "Run with Kip" replays the recorded plays as autopilot steps.
      async autoplay() {
        played = demoSession.plays.length
        return {
          steps: demoSession.plays.map(p => ({ week: clone(p.week), session: clone(p.session), recordedLevers: clone(p.levers) })),
          session: clone(final), autopilot: true,
        }
      },
    }
  }

  return {
    demo: false,
    async load() {
      const { data: past } = await api.get(`/simulation/idea/${ideaId}/sessions`)
      const live = (past || []).find(r => r.status === 'in_progress')
      const session = live
        ? (await api.get(`/simulation/sessions/${live.session_id}`)).data
        : (await api.post('/simulation/sessions', { idea_id: Number(ideaId), horizon_weeks: 4 })).data
      return { session, past: past || [] }
    },
    async play(sessionId, levers) {
      const { data } = await api.post(`/simulation/sessions/${sessionId}/weeks`, { levers })
      return data
    },
    async restart(horizonWeeks = 4) {
      const { data } = await api.post('/simulation/sessions', { idea_id: Number(ideaId), horizon_weeks: horizonWeeks })
      return data
    },
    async past() {
      const { data } = await api.get(`/simulation/idea/${ideaId}/sessions`)
      return data || []
    },
    async advice(sessionId) {
      const { data } = await api.post(`/simulation/sessions/${sessionId}/advice`)
      return data   // { week, problem, solution }
    },
    async autoplay(sessionId) {
      const { data } = await api.post(`/simulation/sessions/${sessionId}/autoplay`)
      return data   // { steps: [{ week, session, recordedLevers }], session }
    },
  }
}
