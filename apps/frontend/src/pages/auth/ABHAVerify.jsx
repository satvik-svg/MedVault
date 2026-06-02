import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import './Auth.css'

export default function ABHAVerify() {
  const [step, setStep] = useState(1)
  const [abhaId, setAbhaId] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
  }

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__left-content">

          <Link to="/" className="auth-page__logo"><img src="/logo-removebg-preview.png" alt="MedVault Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} /><span className="navbar__logo-text">MedVault</span></Link>
          <h2 className="auth-page__left-title">Verify your ABHA<br />Health Account</h2>
          <p className="auth-page__left-desc">Connect your Ayushman Bharat Health Account for seamless medical records access.</p>
        </div>
      </div>
      <div className="auth-page__right">
        <motion.div className="auth-form-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="auth-form__title">ABHA Verification</h1>
          <p className="auth-form__subtitle">Connect your Ayushman Bharat Health Account</p>

          {/* Progress Steps */}
          <div className="abha-steps">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`abha-step ${step >= s ? 'abha-step--active' : ''} ${step > s ? 'abha-step--done' : ''}`}>
                <div className="abha-step__circle">{step > s ? <CheckCircle size={16} /> : s}</div>
                <span className="abha-step__label">{s === 1 ? 'ABHA ID' : s === 2 ? 'OTP' : 'Verified'}</span>
              </div>
            ))}
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label">Enter 14-digit ABHA Number</label>
                <input className="form-input" placeholder="XX-XXXX-XXXX-XXXX" value={abhaId} onChange={(e) => setAbhaId(e.target.value)} style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px' }} />
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setStep(2)}>Verify ABHA ID<ArrowRight size={18} /></button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-4)' }}>
                OTP sent to linked mobile ●●●●●●7890
              </p>
              <div className="otp-inputs" style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`} className="form-input otp-box" type="text" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    style={{ width: '48px', height: '56px', textAlign: 'center', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}
                  />
                ))}
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setStep(3)}>Verify OTP<ArrowRight size={18} /></button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-safe-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', color: 'var(--color-safe)' }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>Identity Verified!</h3>
              <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)' }}>Your ABHA ID has been verified via ABDM API. Loading your records…</p>
              <div className="abha-progress">
                <div className="abha-progress__step abha-progress__step--done">ABDM ✓</div>
                <div className="abha-progress__connector" />
                <div className="abha-progress__step abha-progress__step--done">MedVault ✓</div>
                <div className="abha-progress__connector" />
                <div className="abha-progress__step abha-progress__step--done">Complete ✓</div>
              </div>
              <Link to="/patient/dashboard" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-6)' }}>Go to Dashboard<ArrowRight size={18} /></Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      <style>{`
        .abha-steps { display: flex; justify-content: center; gap: var(--space-8); margin-bottom: var(--space-8); }
        .abha-step { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
        .abha-step__circle {
          width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--color-gray-200);
          display: flex; align-items: center; justify-content: center; font-size: var(--text-sm);
          font-weight: var(--weight-bold); color: var(--color-gray-400); transition: all 0.3s ease;
        }
        .abha-step--active .abha-step__circle { border-color: var(--color-primary-500); color: var(--color-primary-500); }
        .abha-step--done .abha-step__circle { background: var(--color-primary-500); border-color: var(--color-primary-500); color: white; }
        .abha-step__label { font-size: var(--text-xs); color: var(--color-gray-400); font-weight: var(--weight-medium); }
        .abha-step--active .abha-step__label { color: var(--color-primary-600); }
        .abha-progress { display: flex; align-items: center; justify-content: center; gap: var(--space-3); }
        .abha-progress__step { padding: var(--space-2) var(--space-3); background: var(--color-safe-bg); color: var(--color-safe); border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--weight-semibold); }
        .abha-progress__connector { width: 24px; height: 2px; background: var(--color-safe); }
      `}</style>
    </div>
  )
}
