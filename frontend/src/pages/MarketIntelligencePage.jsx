import React, { useState, useEffect } from 'react'
import {
  MapPin, BarChart2, Users, TrendingUp, Search,
  Building2, Zap, DollarSign, ShoppingBag, Info
} from 'lucide-react'
import Layout from '../components/Layout'
import RotatingWords from '../components/RotatingWords'
import api from '../lib/api'
import { useT } from '../context/TranslationContext'

const FIELD_LABELS = {
  avg_avg_shop_rent_pm:        { labelKey: 'market_intel.avg_rent',         icon: Building2,   format: v => `K${v.toLocaleString()}/mo`  },
  avg_avg_labor_wage_pm:       { labelKey: 'market_intel.avg_labour_wage',  icon: Users,       format: v => `K${v.toLocaleString()}/mo`  },
  avg_avg_tomato_price_per_kg: { labelKey: 'market_intel.tomato_price',     icon: ShoppingBag, format: v => `K${v.toFixed(2)}`           },
  avg_avg_bread_price:         { labelKey: 'market_intel.bread_price',      icon: ShoppingBag, format: v => `K${v.toFixed(2)}`           },
  avg_avg_phone_data_1gb:      { labelKey: 'market_intel.data_price',       icon: Zap,         format: v => `K${v.toFixed(2)}`           },
  most_common_foot_traffic:    { labelKey: 'market_intel.foot_traffic',     icon: Users,       format: v => v.replace(/_/g,' ')          },
  most_common_dominant_income_level:{ labelKey: 'market_intel.income_level', icon: DollarSign,  format: v => v.replace(/_/g,' ')          },
  most_common_competition_quality:  { labelKey: 'market_intel.competition', icon: TrendingUp,  format: v => v.replace(/_/g,' ')          },
  most_common_area_type:       { labelKey: 'market_intel.area_type',        icon: MapPin,      format: v => v.replace(/_/g,' ')          },
}

function TownCard({ town, onClick, selected }) {
  const { t } = useT()
  const agg  = town.aggregated || {}
  const subs = town.submissions || 0

  return (
    <div onClick={() => onClick(town)}
      className="kip-card"
      style={{
        padding: '16px 18px', cursor: 'pointer',
        border: selected
          ? '1px solid rgba(43,127,255,0.5)'
          : '1px solid var(--border)',
        background: selected
          ? 'linear-gradient(135deg,rgba(43,127,255,0.1),rgba(0,240,200,0.04))'
          : undefined,
        transition: 'all 0.2s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
            {town.town}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {subs} {t('market_intel.survey_submissions')}
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MapPin size={16} style={{ color: 'var(--blue-bright)' }} />
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {agg.most_common_foot_traffic && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--teal-dim)', color: 'var(--teal)', fontFamily: 'Syne', fontWeight: 600 }}>
            {agg.most_common_foot_traffic.replace(/_/g,' ')} {t('market_intel.traffic_suffix')}
          </span>
        )}
        {agg.most_common_area_type && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--blue-dim)', color: 'var(--blue-bright)', fontFamily: 'Syne', fontWeight: 600 }}>
            {agg.most_common_area_type.replace(/_/g,' ')}
          </span>
        )}
        {agg.most_common_dominant_income_level && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--gold-dim)', color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 600 }}>
            {agg.most_common_dominant_income_level.replace(/_/g,' ')} {t('market_intel.income_suffix')}
          </span>
        )}
      </div>
    </div>
  )
}

function TownDetail({ town }) {
  const { t } = useT()
  const agg  = town.aggregated || {}
  const gaps = agg.market_gaps_mentioned || []

  const stats = Object.entries(FIELD_LABELS)
    .map(([key, meta]) => ({ key, ...meta, value: agg[key] }))
    .filter(s => s.value !== undefined && s.value !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
          {town.town}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
          {t('market_intel.aggregated_from', { count: town.submissions })} ·{' '}
          {t('market_intel.last_updated', { date: town.last_updated ? new Date(town.last_updated).toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' })}
        </p>
      </div>

      {/* Metrics grid */}
      {stats.length > 0 && (
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {t('market_intel.market_metrics')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
            {stats.map(({ key, labelKey, icon: Icon, format, value }) => (
              <div key={key} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Icon size={12} style={{ color: 'var(--muted)' }} />
                  <span style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 600, color: 'var(--muted)' }}>{t(labelKey)}</span>
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: 'var(--text)', textTransform: 'capitalize' }}>
                  {format(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market gaps */}
      {gaps.length > 0 && (
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {t('market_intel.market_gaps_title')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gaps.map((gap, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--green-dim)', border: '1px solid rgba(26,224,110,0.2)', borderRadius: 10 }}>
                <Zap size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor weaknesses */}
      {agg.competitor_weaknesses?.length > 0 && (
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {t('market_intel.competitor_weaknesses_title')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {agg.competitor_weaknesses.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9 }}>
                <TrendingUp size={13} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data note */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <Info size={13} style={{ color: 'var(--faint)', flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.6 }}>
          {t('market_intel.data_note')}
        </span>
      </div>
    </div>
  )
}

export default function MarketIntelligencePage() {
  const { t, tList } = useT()
  const [towns,    setTowns]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    api.get('/templates/market-intelligence')
      .then(r => {
        const t = r.data.towns || []
        setTowns(t)
        if (t.length) setSelected(t[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = towns.filter(t =>
    t.town.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--teal-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={18} style={{ color: 'var(--teal)' }} />
            </div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: 0 }}>
              {t('market_intel.title')}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 620 }}>
            {t('market_intel.page_desc_prefix')}<RotatingWords words={tList('market_intel.page_desc_items')} />{t('market_intel.page_desc_suffix')}
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,240,200,0.2)', borderTopColor: 'var(--teal)', animation: 'spinSlow 0.8s linear infinite' }} />
          </div>
        ) : towns.length === 0 ? (
          <div className="kip-card" style={{ padding: '52px 24px', textAlign: 'center' }}>
            <BarChart2 size={44} style={{ color: 'var(--faint)', margin: '0 auto 14px', display: 'block' }} className="animate-float" />
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
              {t('market_intel.empty_title')}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 400, margin: '0 auto 20px' }}>
              {t('market_intel.empty_desc')}
            </p>
            <a href="/survey" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, background: 'var(--teal-dim)', border: '1px solid rgba(0,240,200,0.3)', color: 'var(--teal)', textDecoration: 'none', fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>
              <MapPin size={14} /> {t('market_intel.submit_survey')}
            </a>
          </div>
        ) : (
          <div className="mi-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr)', gap: 20, alignItems: 'start' }}>

            {/* Left — town list */}
            <div className="mi-list-col">
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('market_intel.search_placeholder')}
                  className="kip-input" style={{ paddingLeft: 34, fontSize: 13 }} />
              </div>

              <div className="mi-list-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--faint)' }}>{t('market_intel.no_match', { search })}</div>
                ) : filtered.map(town => (
                  <TownCard key={town.slug} town={town} onClick={setSelected} selected={selected?.slug === town.slug} />
                ))}
              </div>

              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)' }}>{t('market_intel.help_build_map_title')}</strong> {t('market_intel.help_build_map_desc')}
              </div>
            </div>

            {/* Right — town detail */}
            <div className="kip-card mi-detail-col" style={{ padding: '20px 22px' }}>
              {selected
                ? <TownDetail town={selected} />
                : <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--faint)', fontSize: 13 }}>{t('market_intel.select_town_prompt')}</div>
              }
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .mi-split       { grid-template-columns: 1fr !important; }
          .mi-list-scroll { max-height: 260px !important; }
        }
      `}</style>
    </Layout>
  )
}
