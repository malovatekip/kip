import React, { useState } from 'react'
import { X, Zap, Crown, CheckCircle, Loader2, Smartphone, CreditCard } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

const FEATURES = [
  'Unlimited business ideas from KIP',
  'Unlimited business chat messages',
  'ML revenue predictions & trend analysis',
  'Business plan PDF generation',
  'AI letter generation (loan, supplier, council)',
  'Enterprise / multi-branch management',
]

const NETWORKS = [
  { value: 'mtn',    label: 'MTN Mobile Money',   color: '#FFD700' },
  { value: 'airtel', label: 'Airtel Money',        color: '#FF4B2B' },
  { value: 'zamtel', label: 'Zamtel Money',         color: '#00AA44' },
]

export default function UpgradeModal({ reason, onClose }) {
  const [tab,     setTab]     = useState('card')   // 'card' | 'mobile'
  const [network, setNetwork] = useState('mtn')
  const [phone,   setPhone]   = useState('')
  const [months,  setMonths]  = useState(1)
  const [loading, setLoading] = useState(false)
  const [mobileStep, setMobileStep] = useState('form') // 'form' | 'waiting' | 'done'

  const amount = 49 * months

  const handleStripe = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/stripe/create-checkout', { months })
      window.location.href = data.checkout_url
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not start checkout.')
      setLoading(false)
    }
  }

  const handleMobileMoney = async () => {
    if (!phone.trim()) { toast.error('Enter your phone number.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/flutterwave/initiate', {
        phone_number: phone,
        network,
        months,
      })
      setMobileStep('waiting')
      toast.success(data.message, { duration: 6000 })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payment initiation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="animate-slide-up" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 500,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(43,127,255,0.15), rgba(0,240,200,0.08))',
          borderBottom: '1px solid var(--border)',
          padding: '20px 20px 16px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Crown size={18} style={{ color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
                  Upgrade to Premium
                </span>
              </div>
              {reason && (
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{reason}</p>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* Features */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Everything in Premium
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <CheckCircle size={13} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Duration selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Duration
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 3, 6].map(m => (
                <button key={m} onClick={() => setMonths(m)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
                  background: months === m ? 'var(--blue-dim)' : 'var(--input-bg)',
                  border: `1px solid ${months === m ? 'rgba(43,127,255,0.4)' : 'var(--border)'}`,
                  color: months === m ? 'var(--blue-bright)' : 'var(--muted)',
                  transition: 'all 0.2s ease',
                }}>
                  <div>{m} mo</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: months === m ? 'var(--blue-bright)' : 'var(--text)', marginTop: 2 }}>
                    K{49 * m}
                  </div>
                  {m > 1 && <div style={{ fontSize: 9, color: 'var(--teal)', marginTop: 1 }}>K49/mo</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Payment tabs */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              {[
                { key: 'card',   label: 'Card Payment',   icon: CreditCard  },
                { key: 'mobile', label: 'Mobile Money',   icon: Smartphone  },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 0', background: 'none', border: 'none',
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
                  color: tab === key ? 'var(--blue-bright)' : 'var(--muted)',
                  borderBottom: `2px solid ${tab === key ? 'var(--blue-bright)' : 'transparent'}`,
                  cursor: 'pointer', marginBottom: -1,
                }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {/* Card payment */}
            {tab === 'card' && (
              <div>
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text)' }}>K{amount}</strong> charged to your card via Stripe. Secure, international card payment. Visa, Mastercard accepted.
                </div>
                <button onClick={handleStripe} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
                  {loading
                    ? <><Loader2 size={16} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Redirecting to Checkout…</>
                    : <><CreditCard size={15} /> Pay K{amount} with Card</>
                  }
                </button>
              </div>
            )}

            {/* Mobile money */}
            {tab === 'mobile' && (
              <div>
                {mobileStep === 'form' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Network</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {NETWORKS.map(n => (
                          <button key={n.value} onClick={() => setNetwork(n.value)} style={{
                            flex: 1, padding: '9px 6px', borderRadius: 9, cursor: 'pointer',
                            fontFamily: 'Syne', fontWeight: 700, fontSize: 11,
                            background: network === n.value ? `${n.color}18` : 'var(--input-bg)',
                            border: `1px solid ${network === n.value ? n.color + '60' : 'var(--border)'}`,
                            color: network === n.value ? n.color : 'var(--muted)',
                          }}>
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Phone number</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="e.g. 0977 123 456" className="kip-input" style={{ fontSize: 14 }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.6 }}>
                      You will receive a USSD prompt on your phone. Approve it to complete the K{amount} payment.
                    </div>
                    <button onClick={handleMobileMoney} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
                      {loading
                        ? <><Loader2 size={16} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Sending prompt…</>
                        : <><Smartphone size={15} /> Pay K{amount} via Mobile Money</>
                      }
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal-dim)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <Smartphone size={24} style={{ color: 'var(--teal)' }} />
                    </div>
                    <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>
                      Check your phone
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 16 }}>
                      A USSD prompt has been sent to <strong style={{ color: 'var(--text)' }}>{phone}</strong>. Approve the K{amount} payment to activate Premium.
                    </p>
                    <button onClick={() => { setMobileStep('form'); setPhone('') }} style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600 }}>
                      Try a different number
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
