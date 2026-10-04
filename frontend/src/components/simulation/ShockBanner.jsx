import React from 'react'
import { ShieldCheck, CloudRain, Zap, Biohazard, Flame, TriangleAlert, Sun } from 'lucide-react'
import { useT } from '../../context/TranslationContext'
import { shockEffect } from './sceneConfigs'

const ICONS = { rain: CloudRain, bolt: Zap, hazard: Biohazard, heat: Flame, alert: TriangleAlert }

/**
 * The coming week's external shock (revealed before Play), or how the last one
 * played out once the week has run.
 *  shock   { name, hit_probability, severity } for the upcoming week
 *  result  last played week's trace (shown after a week, until the next Play)
 */
export default function ShockBanner({ shock, result, playing, fmtUnits }) {
  const { t } = useT()
  if (result && !playing) {
    const calm = result.shock_name === 'Calm week'
    const hit = result.shock_hit
    const Icon = hit ? (ICONS[shockEffect(result.shock_name)] || TriangleAlert) : calm ? Sun : ShieldCheck
    return (
      <div className={`sim-shock ${hit ? 'sev-high is-hit' : 'sev-none'}`}>
        <div className="sim-shock-icon"><Icon size={19} /></div>
        <div className="sim-shock-text">
          <div className="sim-eyebrow">{t('simulate.shock_last_week', { week: result.week })}</div>
          <div className="sim-shock-name">
            {calm ? t('simulate.shock_calm_result')
              : hit ? t('simulate.shock_hit_title', { name: result.shock_name })
              : t('simulate.shock_avoided_title', { name: result.shock_name })}
          </div>
          <div className="sim-shock-sub">
            {hit ? t('simulate.shock_hit_sub', { units: fmtUnits(result.units_lost) })
              : calm ? t('simulate.shock_calm_done') : t('simulate.shock_avoided_sub')}
          </div>
        </div>
      </div>
    )
  }

  if (!shock) return null
  const calm = shock.severity === 'none'
  const Icon = calm ? Sun : (ICONS[shockEffect(shock.name)] || TriangleAlert)
  return (
    <div className={`sim-shock sev-${shock.severity || 'none'}`}>
      <div className="sim-shock-icon"><Icon size={19} /></div>
      <div className="sim-shock-text">
        <div className="sim-eyebrow">{t('simulate.shock_eyebrow', { week: shock.week })}</div>
        <div className="sim-shock-name">{calm ? t('simulate.shock_calm_title') : shock.name}</div>
        <div className="sim-shock-sub">
          {calm ? t('simulate.shock_calm_sub')
            : t('simulate.shock_threat_sub', { pct: Math.round((shock.hit_probability || 0) * 100) })}
        </div>
      </div>
      {!calm && (
        <span className={`sim-chip ${shock.severity === 'high' ? 'is-red' : 'is-gold'}`}>
          {t(`simulate.severity_${shock.severity}`)}
        </span>
      )}
    </div>
  )
}
