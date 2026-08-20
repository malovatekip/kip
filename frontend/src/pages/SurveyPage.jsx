import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, Users, ShoppingBag, Truck, Building2,
  ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
  CheckCircle, Send, Info
} from 'lucide-react'
import Layout from '../components/Layout'
import RotatingWords from '../components/RotatingWords'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useT } from '../context/TranslationContext'

/* ── Option button ───────────────────────────────────── */
function OptionBtn({ value, selected, label, color = 'var(--blue-bright)', onClick }) {
  return (
    <button onClick={() => onClick(value)} style={{
      padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
      fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
      color: selected ? color : 'var(--muted)',
      background: selected ? `${color}12` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${selected ? color + '40' : 'rgba(255,255,255,0.07)'}`,
      transition: 'all 0.2s ease',
    }}>
      {label}
    </button>
  )
}

/* ── Section wrapper ─────────────────────────────────── */
function SurveySection({ num, icon: Icon, title, color, desc, children, active, onToggle }) {
  return (
    <div style={{
      border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
      transition: 'border-color 0.2s ease',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: active ? `${color}0A` : 'rgba(255,255,255,0.02)',
        cursor: 'pointer', border: 'none', transition: 'background 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color,
          }}>
            {num}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff' }}>{title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
          </div>
        </div>
        {active
          ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} />
          : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
        }
      </button>
      {active && (
        <div style={{ padding: '20px', borderTop: `1px solid ${color}20` }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Field helpers ───────────────────────────────────── */
function FieldLabel({ label, hint }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 6 }}>({hint})</span>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} className="kip-input" style={{ fontSize: 13, marginBottom: 14 }} />
  )
}

function NumInput({ value, onChange, placeholder = '0', prefix = '' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--muted)' }}>{prefix}</span>}
      <input type="number" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="kip-input"
        style={{ fontSize: 13, paddingLeft: prefix ? 48 : 14 }} />
    </div>
  )
}

function Options({ value, onChange, options, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      {options.map(o => (
        <OptionBtn key={o.v} value={o.v} label={o.l} selected={value === o.v}
          color={color} onClick={onChange} />
      ))}
    </div>
  )
}

/* ── Progress bar ────────────────────────────────────── */
function Progress({ sections, data }) {
  const { t } = useT()
  const filled = sections.filter(s => {
    const check = s.requiredFields || []
    return check.some(f => data[f] !== null && data[f] !== '' && data[f] !== undefined)
  }).length
  const pct = (filled / sections.length) * 100
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600 }}>
          {t('survey.sections_completed', { filled, total: sections.length })}
        </span>
        <span style={{ fontSize: 12, color: pct === 100 ? 'var(--green)' : 'var(--blue-bright)', fontFamily: 'Syne', fontWeight: 700 }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="kip-progress">
        <div className="kip-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ── MAIN ────────────────────────────────────────────── */
export default function SurveyPage() {
  const { t, tList } = useT()
  const { planId } = useParams()
  const navigate   = useNavigate()
  const [activeSection, setActiveSection] = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [planName,  setPlanName]  = useState('')

  const [data, setData] = useState({
    location: '', plan_id: planId ? parseInt(planId) : null,
    // Section 1: Location
    area_type: '', foot_traffic: '', road_access: '',
    power_reliability: '', internet_access: '',
    has_nearby_market: false, market_distance_km: '',
    // Section 2: Customers
    dominant_income_level: '', primary_occupation: '',
    peak_shopping_time: '', payment_preference: '',
    avg_spend_per_visit: '',
    // Section 3: Competition
    direct_competitors_count: '', competition_quality: '',
    main_competitor_weakness: '', market_gaps_noted: '',
    // Section 4: Supply
    nearest_wholesale_km: '', supplier_reliability: '',
    main_supply_source: '',
    // Section 5: Environment
    has_cdf_office: false, has_ceec_office: false,
    has_bank_branch: false, security_level: '',
    seasonal_business: false, peak_season_months: '',
    additional_notes: '',
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  useEffect(() => {
    if (planId) {
      api.get(`/business/my-plans`).then(r => {
        const plan = r.data.find(p => p.id === parseInt(planId))
        if (plan) setPlanName(plan.business_name)
      }).catch(() => {})
      api.get(`/logs/survey/${planId}`).then(r => {
        if (r.data) setData(prev => ({ ...prev, ...r.data }))
      }).catch(() => {})
    }
  }, [planId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...data }
      // Convert numeric strings
      if (payload.market_distance_km) payload.market_distance_km = parseFloat(payload.market_distance_km) || null
      if (payload.avg_spend_per_visit) payload.avg_spend_per_visit = parseFloat(payload.avg_spend_per_visit) || null
      if (payload.direct_competitors_count) payload.direct_competitors_count = parseInt(payload.direct_competitors_count) || null
      if (payload.nearest_wholesale_km) payload.nearest_wholesale_km = parseFloat(payload.nearest_wholesale_km) || null

      await api.post('/logs/survey', payload)
      setSaved(true)
      toast.success(t('survey.save_success'))
    } catch {
      toast.error(t('survey.save_failed'))
    } finally {
      setSaving(false) }
  }

  const SECTIONS = [
    { title: t('survey.section_location_title'),  desc: t('survey.section_location_desc'), icon: MapPin,     color: 'var(--blue-bright)', requiredFields: ['area_type', 'foot_traffic'] },
    { title: t('survey.section_customer_title'),   desc: t('survey.section_customer_desc'),              icon: Users,      color: 'var(--teal)',        requiredFields: ['dominant_income_level'] },
    { title: t('survey.section_competition_title'),desc: t('survey.section_competition_desc'),     icon: ShoppingBag,color: 'var(--gold)',        requiredFields: ['competition_quality'] },
    { title: t('survey.section_supply_title'),     desc: t('survey.section_supply_desc'),               icon: Truck,      color: 'var(--green)',       requiredFields: ['supplier_reliability'] },
    { title: t('survey.section_environment_title'),desc: t('survey.section_environment_desc'),       icon: Building2,  color: 'var(--muted)',       requiredFields: ['security_level'] },
  ]

  return (
    <Layout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          {planId && (
            <Link to={`/business/${planId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', textDecoration: 'none', marginBottom: 12 }}>
              <ArrowLeft size={14} /> {t('common.back')}
            </Link>
          )}
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 6 }}>
            {t('survey.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 580 }}>
            {t('survey.subtitle_prefix')}<RotatingWords words={tList('survey.subtitle_items')} />{t('survey.subtitle_suffix')}
            {planName && <span style={{ color: 'var(--blue-bright)', fontWeight: 600 }}> {t('survey.for_business', { name: planName })}</span>}
          </p>
        </div>

        {/* Info banner */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(27,110,243,0.06)', border: '1px solid rgba(27,110,243,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        }}>
          <Info size={15} style={{ color: 'var(--blue-bright)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            {t('survey.info_banner')}
          </p>
        </div>

        {/* Progress */}
        <Progress sections={SECTIONS} data={data} />

        {/* Location input */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel label={t('survey.field_location')} hint={t('survey.field_location_hint')} />
          <TextInput value={data.location} onChange={v => set('location', v)} placeholder="e.g. Riverside, Kitwe" />
        </div>

        {/* Section 1 — Location & Infrastructure */}
        <SurveySection num="1" icon={MapPin} title={SECTIONS[0].title} desc={SECTIONS[0].desc}
          color={SECTIONS[0].color} active={activeSection === 0} onToggle={() => setActiveSection(activeSection === 0 ? -1 : 0)}>

          <FieldLabel label={t('survey.field_area_type')} />
          <Options value={data.area_type} onChange={v => set('area_type', v)} color="var(--blue-bright)" options={[
            {v:'residential',l:t('survey.opt_residential')},{v:'commercial',l:t('survey.opt_commercial')},{v:'market',l:t('survey.opt_market_area')},
            {v:'cbd',l:t('survey.opt_cbd')},{v:'industrial',l:t('survey.opt_industrial')},{v:'peri_urban',l:t('survey.opt_peri_urban')},
          ]} />

          <FieldLabel label={t('survey.field_foot_traffic')} hint={t('survey.field_foot_traffic_hint')} />
          <Options value={data.foot_traffic} onChange={v => set('foot_traffic', v)} color="var(--blue-bright)" options={[
            {v:'very_high',l:t('survey.opt_very_high_traffic')},{v:'high',l:t('survey.opt_high_traffic')},
            {v:'medium',l:t('survey.opt_medium_traffic')},{v:'low',l:t('survey.opt_low_traffic')},
          ]} />

          <FieldLabel label={t('survey.field_road_access')} />
          <Options value={data.road_access} onChange={v => set('road_access', v)} color="var(--blue-bright)" options={[
            {v:'tarmac',l:t('survey.opt_tarmac_road')},{v:'gravel',l:t('survey.opt_gravel_road')},{v:'poor',l:t('survey.opt_poor_dirt')},
          ]} />

          <FieldLabel label={t('survey.field_electricity')} />
          <Options value={data.power_reliability} onChange={v => set('power_reliability', v)} color="var(--blue-bright)" options={[
            {v:'reliable',l:t('general_survey.opt_reliable')},{v:'load_shedding',l:t('general_survey.opt_load_shedding')},{v:'unreliable',l:t('general_survey.opt_very_unreliable')},
          ]} />

          <FieldLabel label={t('survey.field_internet')} />
          <Options value={data.internet_access} onChange={v => set('internet_access', v)} color="var(--blue-bright)" options={[
            {v:'good',l:t('general_survey.opt_good_4g')},{v:'fair',l:t('general_survey.opt_fair_3g')},{v:'poor',l:t('general_survey.opt_poor')},{v:'none',l:t('survey.opt_no_internet')},
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <button onClick={() => set('has_nearby_market', !data.has_nearby_market)} style={{
              width: 40, height: 22, borderRadius: 11, cursor: 'pointer', border: 'none',
              background: data.has_nearby_market ? 'var(--green)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.2s ease',
            }}>
              <span style={{
                position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s ease',
                left: data.has_nearby_market ? 20 : 4,
              }} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('survey.nearby_market_toggle')}</span>
          </div>

          {data.has_nearby_market && (
            <>
              <FieldLabel label={t('survey.field_market_distance')} />
              <NumInput value={data.market_distance_km} onChange={v => set('market_distance_km', v)} placeholder="0.5" prefix="km" />
            </>
          )}
        </SurveySection>

        {/* Section 2 — Customer Profile */}
        <SurveySection num="2" icon={Users} title={SECTIONS[1].title} desc={SECTIONS[1].desc}
          color={SECTIONS[1].color} active={activeSection === 1} onToggle={() => setActiveSection(activeSection === 1 ? -1 : 1)}>

          <FieldLabel label={t('survey.field_income_level')} />
          <Options value={data.dominant_income_level} onChange={v => set('dominant_income_level', v)} color="var(--teal)" options={[
            {v:'low',l:t('general_survey.opt_low_income')},{v:'lower_mid',l:t('general_survey.opt_lower_middle')},
            {v:'middle',l:t('general_survey.opt_middle_class')},{v:'upper',l:t('survey.opt_upper_middle_high')},
          ]} />

          <FieldLabel label={t('survey.field_primary_occupation')} />
          <Options value={data.primary_occupation} onChange={v => set('primary_occupation', v)} color="var(--teal)" options={[
            {v:'mining',l:t('survey.opt_mining')},{v:'farming',l:t('survey.opt_farming')},{v:'government',l:t('survey.opt_government')},
            {v:'informal_trade',l:t('survey.opt_informal_trade')},{v:'formal_employment',l:t('survey.opt_formal_employment')},
            {v:'mixed',l:t('survey.opt_mixed')},{v:'students',l:t('survey.opt_students')},
          ]} />

          <FieldLabel label={t('survey.field_peak_shopping_time')} hint={t('survey.field_peak_shopping_time_hint')} />
          <Options value={data.peak_shopping_time} onChange={v => set('peak_shopping_time', v)} color="var(--teal)" options={[
            {v:'morning',l:t('survey.opt_morning')},{v:'afternoon',l:t('survey.opt_afternoon')},
            {v:'evening',l:t('survey.opt_evening')},{v:'weekend',l:t('survey.opt_weekends')},
          ]} />

          <FieldLabel label={t('survey.field_payment_preference')} />
          <Options value={data.payment_preference} onChange={v => set('payment_preference', v)} color="var(--teal)" options={[
            {v:'cash',l:t('survey.opt_cash_only')},{v:'mobile_money',l:t('survey.opt_mobile_money')},{v:'mix',l:t('survey.opt_mix_of_both')},
          ]} />

          <FieldLabel label={t('survey.field_avg_spend')} />
          <NumInput value={data.avg_spend_per_visit} onChange={v => set('avg_spend_per_visit', v)} placeholder="50" prefix="K" />
        </SurveySection>

        {/* Section 3 — Competition */}
        <SurveySection num="3" icon={ShoppingBag} title={SECTIONS[2].title} desc={SECTIONS[2].desc}
          color={SECTIONS[2].color} active={activeSection === 2} onToggle={() => setActiveSection(activeSection === 2 ? -1 : 2)}>

          <FieldLabel label={t('survey.field_competitors_count')} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[{v:'0',l:t('survey.opt_none')},{v:'1',l:'1'},{v:'2',l:'2-3'},{v:'5',l:'4-6'},{v:'10',l:'7+'}].map(o => (
              <OptionBtn key={o.v} value={o.v} label={o.l} selected={data.direct_competitors_count == o.v}
                color="var(--gold)" onClick={v => set('direct_competitors_count', v)} />
            ))}
          </div>

          <FieldLabel label={t('survey.field_competition_strength')} />
          <Options value={data.competition_quality} onChange={v => set('competition_quality', v)} color="var(--gold)" options={[
            {v:'none',l:t('survey.opt_no_competition')},{v:'weak',l:t('survey.opt_weak')},{v:'moderate',l:t('survey.opt_moderate')},{v:'strong',l:t('survey.opt_strong')},
          ]} />

          <FieldLabel label={t('survey.field_competitor_weakness')} hint={t('survey.field_competitor_weakness_hint')} />
          <TextInput value={data.main_competitor_weakness} onChange={v => set('main_competitor_weakness', v)}
            placeholder={t('survey.field_competitor_weakness_placeholder')} />

          <FieldLabel label={t('survey.field_market_gaps')} hint={t('survey.field_market_gaps_hint')} />
          <textarea value={data.market_gaps_noted || ''} onChange={e => set('market_gaps_noted', e.target.value)}
            placeholder={t('survey.field_market_gaps_placeholder')}
            className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13, marginBottom: 14 }} />
        </SurveySection>

        {/* Section 4 — Supply Chain */}
        <SurveySection num="4" icon={Truck} title={SECTIONS[3].title} desc={SECTIONS[3].desc}
          color={SECTIONS[3].color} active={activeSection === 3} onToggle={() => setActiveSection(activeSection === 3 ? -1 : 3)}>

          <FieldLabel label={t('survey.field_wholesale_distance')} />
          <NumInput value={data.nearest_wholesale_km} onChange={v => set('nearest_wholesale_km', v)} placeholder="5" prefix="km" />

          <FieldLabel label={t('survey.field_supplier_reliability')} />
          <Options value={data.supplier_reliability} onChange={v => set('supplier_reliability', v)} color="var(--green)" options={[
            {v:'good',l:t('survey.opt_supplier_good')},{v:'fair',l:t('survey.opt_supplier_fair')},
            {v:'poor',l:t('survey.opt_supplier_poor')},
          ]} />

          <FieldLabel label={t('survey.field_main_supply_source')} />
          <TextInput value={data.main_supply_source} onChange={v => set('main_supply_source', v)}
            placeholder={t('survey.field_main_supply_source_placeholder')} />
        </SurveySection>

        {/* Section 5 — Business Environment */}
        <SurveySection num="5" icon={Building2} title={SECTIONS[4].title} desc={SECTIONS[4].desc}
          color={SECTIONS[4].color} active={activeSection === 4} onToggle={() => setActiveSection(activeSection === 4 ? -1 : 4)}>

          {/* Financing nearby */}
          <FieldLabel label={t('survey.field_financing_options')} hint={t('survey.field_financing_options_hint')} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { key: 'has_cdf_office',  label: t('survey.opt_cdf_office'),   color: 'var(--teal)' },
              { key: 'has_ceec_office', label: t('survey.opt_ceec_office'),  color: 'var(--teal)' },
              { key: 'has_bank_branch', label: t('survey.opt_bank_branch'),  color: 'var(--teal)' },
            ].map(({ key, label, color }) => (
              <button key={key} onClick={() => set(key, !data[key])} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
                color: data[key] ? color : 'var(--muted)',
                background: data[key] ? `${color}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${data[key] ? color + '40' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.2s ease',
              }}>
                {data[key] ? <CheckCircle size={13} /> : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid var(--faint)' }} />}
                {label}
              </button>
            ))}
          </div>

          <FieldLabel label={t('survey.field_security_level')} />
          <Options value={data.security_level} onChange={v => set('security_level', v)} color="var(--muted)" options={[
            {v:'safe',l:t('survey.opt_safe_area')},{v:'moderate',l:t('survey.opt_moderate')},{v:'risky',l:t('survey.opt_risky')},
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <button onClick={() => set('seasonal_business', !data.seasonal_business)} style={{
              width: 40, height: 22, borderRadius: 11, cursor: 'pointer', border: 'none',
              background: data.seasonal_business ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.2s ease',
            }}>
              <span style={{
                position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s ease', left: data.seasonal_business ? 20 : 4,
              }} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('survey.seasonal_business_toggle')}</span>
          </div>

          {data.seasonal_business && (
            <>
              <FieldLabel label={t('survey.field_peak_months')} />
              <TextInput value={data.peak_season_months} onChange={v => set('peak_season_months', v)}
                placeholder={t('survey.field_peak_months_placeholder')} />
            </>
          )}

          <FieldLabel label={t('survey.field_anything_else')} hint={t('templates.optional')} />
          <textarea value={data.additional_notes || ''} onChange={e => set('additional_notes', e.target.value)}
            placeholder={t('survey.field_anything_else_placeholder')}
            className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
        </SurveySection>

        {/* Save button */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: '14px 0', borderRadius: 14,
            background: saved ? 'linear-gradient(135deg, var(--green), #00A854)' : 'linear-gradient(135deg, var(--blue), var(--mid))',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: saved ? 'var(--base)' : '#fff',
            boxShadow: saved ? '0 4px 20px rgba(0,230,118,0.3)' : '0 4px 20px rgba(27,110,243,0.3)',
            opacity: saving ? 0.7 : 1, transition: 'all 0.25s ease',
          }}>
            {saving
              ? <><div style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} /> {t('survey.saving')}</>
              : saved
                ? <><CheckCircle size={17} /> {t('survey.saved_kip_learning')}</>
                : <><Send size={17} /> {t('survey.save_button')}</>
            }
          </button>
          {planId && saved && (
            <Link to={`/business/${planId}`} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, fontFamily: 'Syne',
              color: 'var(--blue-bright)', textDecoration: 'none',
              padding: '14px 20px', borderRadius: 14,
              border: '1px solid rgba(27,110,243,0.3)',
              background: 'rgba(27,110,243,0.06)',
            }}>
              {t('survey.back_to_business')} <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {saved && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
            {t('survey.saved_footer_note')}
          </p>
        )}

      </div>
    </Layout>
  )
}
