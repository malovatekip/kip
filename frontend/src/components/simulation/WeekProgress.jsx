import React from 'react'
import { Check } from 'lucide-react'
import { useT } from '../../context/TranslationContext'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/**
 * Progress through the running week (day by day) plus the W1..Wn timeline.
 *  horizon     total weeks
 *  played      weeks completed
 *  weeks       played week traces (for each node's viability)
 *  playing     a week is animating
 *  progress    0..1 through the animating week
 */
export default function WeekProgress({ horizon, played, weeks = [], playing, progress = 0 }) {
  const { t } = useT()
  const shownProgress = playing ? progress : played >= horizon ? 1 : 0
  const dayNow = Math.min(6, Math.floor(shownProgress * 7))
  const current = Math.min(horizon, played + 1)
  return (
    <div className="sim-panel sim-m-play">
      <div className="sim-panel-head">
        <div className="sim-panel-title">
          {playing ? t('simulate.progress_running', { week: current }) : played >= horizon
            ? t('simulate.progress_done') : t('simulate.progress_ready', { week: current })}
        </div>
        <span className="sim-num" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
          {Math.round(shownProgress * 100)}%
        </span>
      </div>
      <div className="sim-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(shownProgress * 100)} aria-label={t('simulate.progress_label')}>
        <div className="sim-progress-fill" style={{ width: `${shownProgress * 100}%` }} />
      </div>
      <div className="sim-days">
        {DAY_KEYS.map((d, i) => (
          <span key={d} className={playing ? (i < dayNow ? 'is-done' : i === dayNow ? 'is-now' : '') : ''}>
            {t(`simulate.day_${d}`)}
          </span>
        ))}
      </div>
      <div className="sim-timeline" aria-label={t('simulate.timeline_label')}>
        {Array.from({ length: horizon }, (_, i) => {
          const w = i + 1
          const done = w <= played
          const now = w === current && played < horizon
          const v = weeks[i]?.running_viability
          return (
            <React.Fragment key={w}>
              {i > 0 && <div className={`sim-tl-link${w <= played ? ' is-done' : ''}`} />}
              <div className={`sim-tl-node${done ? ' is-done' : now ? ' is-now' : ''}`}
                title={done && v != null ? `W${w}: ${v.toFixed(2)}` : `W${w}`}>
                {done ? <Check size={13} /> : `W${w}`}
                {done && v != null && <small className="sim-num">{v.toFixed(1)}</small>}
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
