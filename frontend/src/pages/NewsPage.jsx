import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Minus, Bell, BellOff,
  ExternalLink, RefreshCw, Zap, DollarSign, ChevronDown, X
} from 'lucide-react'
import Layout from '../components/Layout'
import ParticleBackground from '../components/ParticleBackground'
import api from '../lib/api'

const CATEGORIES = [
  { key:'all',             label:'All News' },
  { key:'general_economy', label:'Economy' },
  { key:'banking_finance', label:'Finance' },
  { key:'exchange_rate',   label:'Exchange Rate' },
  { key:'mining_copper',   label:'Mining' },
  { key:'agriculture',     label:'Agriculture' },
  { key:'fuel_energy',     label:'Fuel & Energy' },
  { key:'sme_business',    label:'SME & Business' },
  { key:'taxation_fiscal', label:'Tax & Fiscal' },
]
const CAT_COLORS = {
  general_economy:'bg-blue-500/20 text-blue-300',
  banking_finance:'bg-teal-500/20 text-teal-300',
  exchange_rate:  'bg-yellow-500/20 text-yellow-300',
  mining_copper:  'bg-orange-500/20 text-orange-300',
  agriculture:    'bg-green-500/20 text-green-300',
  fuel_energy:    'bg-red-500/20 text-red-300',
  sme_business:   'bg-purple-500/20 text-purple-300',
  taxation_fiscal:'bg-pink-500/20 text-pink-300',
}
function timeAgo(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'Just now'
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

function RateTicker({ rates }) {
  if (!rates || !Object.keys(rates).length) return null
  const items = [
    rates.usd_zmw && { label:'USD/ZMW', value:rates.usd_zmw.value?.toFixed(2), dir:rates.usd_zmw.direction, stale:rates.usd_zmw.stale },
    rates.petrol  && { label:'Petrol',  value:`K${rates.petrol.value?.toFixed(2)}/L`, dir:rates.petrol.direction },
    rates.diesel  && { label:'Diesel',  value:`K${rates.diesel.value?.toFixed(2)}/L`, dir:rates.diesel.direction },
  ].filter(Boolean)
  return (
    <div className="kip-card mb-5 border-kip-teal/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-kip-teal animate-pulse" />
        <span className="text-xs font-semibold text-kip-teal uppercase tracking-widest">Live Rates</span>
        {rates.usd_zmw?.fetched_at && <span className="text-xs text-gray-600 ml-auto">Updated {timeAgo(rates.usd_zmw.fetched_at)}</span>}
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map(({ label, value, dir }) => (
          <div key={label} className="flex items-center gap-2 bg-kip-navy/60 border border-kip-blue/20 rounded-xl px-3 py-2 min-w-[110px]">
            <div><div className="text-xs text-gray-400">{label}</div><div className="text-white font-bold text-sm">{value}</div></div>
            {dir==='up'   && <TrendingUp   className="w-4 h-4 text-red-400 ml-auto" />}
            {dir==='down' && <TrendingDown  className="w-4 h-4 text-green-400 ml-auto" />}
            {dir==='stable'&&<Minus         className="w-4 h-4 text-gray-500 ml-auto" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertCard({ alert, onDismiss }) {
  return (
    <div className="bg-gradient-to-r from-kip-blue/15 to-kip-dark border border-kip-gold/40 rounded-2xl p-4 mb-3 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-kip-gold/20 border border-kip-gold/40 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-kip-gold" />
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm mb-1 line-clamp-2">{alert.headline}</div>
            <div className="text-kip-pale text-xs leading-relaxed mb-2">{alert.kip_message}</div>
            <div className="flex items-center gap-2 flex-wrap">
              {alert.business_name && <span className="text-xs bg-kip-blue/20 text-kip-light border border-kip-blue/30 px-2 py-0.5 rounded-full">{alert.business_name}</span>}
              <span className="text-xs text-gray-600">{timeAgo(alert.created_at)}</span>
            </div>
          </div>
        </div>
        <button onClick={() => onDismiss(alert.id)} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ArticleCard({ article }) {
  const catColor = CAT_COLORS[article.category] || 'bg-blue-500/20 text-blue-300'
  const catLabel = CATEGORIES.find(c => c.key === article.category)?.label || article.category
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer"
       className="block kip-card hover:border-kip-light/50 transition-all duration-200 group animate-slide-up">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-kip-light">{article.source_name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${catColor}`}>{catLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-600">{timeAgo(article.published_at || article.fetched_at)}</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-kip-light transition-colors" />
        </div>
      </div>
      <h3 className="text-white font-semibold text-sm leading-snug mb-1.5 group-hover:text-kip-light transition-colors">{article.headline}</h3>
      {article.summary && <p className="text-kip-pale text-xs leading-relaxed line-clamp-2">{article.summary}</p>}
    </a>
  )
}

const LIMIT = 15
export default function NewsPage() {
  const [rates,      setRates]      = useState({})
  const [articles,   setArticles]   = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [category,   setCategory]   = useState('all')
  const [total,      setTotal]      = useState(0)
  const [offset,     setOffset]     = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [loadMore,   setLoadMore]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadRates   = useCallback(() => { api.get('/news/rates').then(r => setRates(r.data)).catch(()=>{}) }, [])
  const loadAlerts  = useCallback(() => { api.get('/news/alerts').then(r => setAlerts(r.data||[])).catch(()=>{}) }, [])
  const loadArticles= useCallback((cat, off, append=false) => {
    const p = `?limit=${LIMIT}&offset=${off}${cat!=='all'?`&category=${cat}`:''}`
    if (!append) setLoading(true); else setLoadMore(true)
    api.get(`/news/articles${p}`).then(r => {
      setTotal(r.data.total||0)
      setArticles(prev => append ? [...prev,...(r.data.articles||[])] : (r.data.articles||[]))
    }).catch(()=>{}).finally(() => { setLoading(false); setLoadMore(false) })
  }, [])

  useEffect(() => {
    loadRates(); loadAlerts(); loadArticles('all',0)
    const iv = setInterval(loadRates, 900000)
    return () => clearInterval(iv)
  }, [])

  const handleCat = cat => { setCategory(cat); setOffset(0); loadArticles(cat,0) }
  const handleMore = () => { const n=offset+LIMIT; setOffset(n); loadArticles(category,n,true) }
  const handleRefresh = async () => {
    setRefreshing(true)
    try { await api.post('/news/articles/refresh'); await api.post('/news/rates/refresh'); loadRates(); loadAlerts(); loadArticles(category,0) } catch{}
    setRefreshing(false)
  }
  const dismissAlert = async id => {
    try { await api.patch(`/news/alerts/${id}/read`); setAlerts(prev=>prev.filter(a=>a.id!==id)) } catch{}
  }

  const unread = alerts.filter(a => !a.is_read)

  return (
    <Layout>
      {/* Particle background — contained within the page */}
      <div className="max-w-4xl mx-auto p-6 relative">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">Economic News Feed</h1>
            <p className="text-gray-400 text-sm">Live rates, Zambian financial news, and KIP alerts</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="kip-btn-outline text-sm py-2 px-4 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <RateTicker rates={rates} />

        {unread.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-kip-gold" />
                <span className="text-white font-semibold text-sm">KIP Alerts</span>
                <span className="bg-kip-gold text-kip-navy text-xs font-bold px-2 py-0.5 rounded-full">{unread.length}</span>
              </div>
              <button onClick={async()=>{ try{await api.patch('/news/alerts/read-all');setAlerts([])}catch{} }} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                <BellOff className="w-3.5 h-3.5" /> Dismiss all
              </button>
            </div>
            {unread.slice(0,3).map(a => <AlertCard key={a.id} alert={a} onDismiss={dismissAlert} />)}
          </div>
        )}

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => handleCat(c.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                ${category===c.key ? 'bg-kip-blue text-white' : 'bg-kip-dark border border-kip-blue/30 text-gray-400 hover:border-kip-light hover:text-white'}`}>
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[0,1,2,3].map(i=><div key={i} className="h-24 shimmer rounded-2xl"/>)}</div>
        ) : articles.length === 0 ? (
          <div className="kip-card text-center py-14 border-dashed border-kip-blue/20">
            <p className="text-white font-semibold mb-1">No articles yet</p>
            <p className="text-gray-500 text-sm mb-4">Run the news fetch to populate the feed</p>
            <code className="text-xs text-kip-light bg-kip-navy/60 px-3 py-1.5 rounded">python fetch_news.py</code>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-600 mb-4">{total} articles</div>
            <div className="space-y-3">{articles.map(a => <ArticleCard key={a.id} article={a} />)}</div>
            {articles.length < total && (
              <div className="text-center mt-6">
                <button onClick={handleMore} disabled={loadMore}
                  className="kip-btn-outline text-sm py-2.5 px-6 flex items-center gap-2 mx-auto">
                  {loadMore ? <><div className="w-4 h-4 border-2 border-kip-light border-t-transparent rounded-full animate-spin"/>Loading...</> : <><ChevronDown className="w-4 h-4"/>Load more</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
