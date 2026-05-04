import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, User, Stethoscope, ShoppingBag, ArrowRight, ArrowLeft, Check, Calendar } from 'lucide-react'
import './Auth.css'

const roles = [
  { id: 'patient', label: 'Patient', icon: <User size={20} /> },
  { id: 'doctor', label: 'Doctor', icon: <Stethoscope size={20} /> },
  { id: 'pharmacy', label: 'Pharmacy', icon: <ShoppingBag size={20} /> },
  { id: 'clinic', label: 'Clinic', icon: <Shield size={20} /> },
]

const stepLabels = ['Basic Info', 'Identity', 'Account']

export default function Register() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('patient')

  const handleNext = () => setStep(s => Math.min(s + 1, 3))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))
  const handleSubmit = (e) => {
    e.preventDefault()
    window.location.href = '/login'
  }

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__left-content">
          <div className="auth-page__left-blobs">
            <div className="blob blob-1" />
            <div className="blob blob-2" />
          </div>
          <Link to="/" className="auth-page__logo">
            <div className="navbar__logo-icon"><Shield size={24} /></div>
            <span className="navbar__logo-text">MedVault</span>
          </Link>
          <h2 className="auth-page__left-title">Join the future of<br />healthcare</h2>
          <p className="auth-page__left-desc">Create your account and experience blockchain-secured healthcare today.</p>

          {/* Step Indicator */}
          <div className="register-step-indicator">
            {stepLabels.map((label, i) => {
              const stepNum = i + 1
              return (
                <div key={label} className="register-step-item">
                  <div className={`register-step-circle ${step >= stepNum ? 'active' : ''} ${step > stepNum ? 'completed' : ''}`}>
                    {step > stepNum ? <Check size={14} /> : stepNum}
                  </div>
                  <span className={`register-step-label ${step >= stepNum ? 'active' : ''}`}>{label}</span>
                  {i < stepLabels.length - 1 && (
                    <div className={`register-step-line ${step > stepNum ? 'completed' : ''}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="auth-page__right">
        <motion.div
          className="auth-form-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          key={step}
        >
          <div className="auth-form__header">
            <h1 className="auth-form__title">
              {step === 1 && 'Create Account'}
              {step === 2 && 'Verify Identity'}
              {step === 3 && 'Secure Your Account'}
            </h1>
            <p className="auth-form__subtitle">
              {step === 1 && 'Step 1 of 3 — Tell us about yourself'}
              {step === 2 && 'Step 2 of 3 — Link your ABHA ID or create new'}
              {step === 3 && 'Step 3 of 3 — Set your password'}
            </p>
          </div>

          {/* Role Selector */}
          <div className="auth-role-selector">
            {roles.map((r) => (
              <button
                key={r.id}
                className={`auth-role-btn ${role === r.id ? 'auth-role-btn--active' : ''}`}
                onClick={() => setRole(r.id)}
              >
                {r.icon}<span>{r.label}</span>
              </button>
            ))}
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

              {/* STEP 1: Basic Info */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input className="form-input" placeholder="John" id="reg-firstname" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input className="form-input" placeholder="Doe" id="reg-lastname" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" placeholder="you@example.com" id="reg-email" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input className="form-input" type="tel" placeholder="+91 98765 43210" id="reg-phone" />
                  </div>
                  {role === 'doctor' && (
                    <div className="form-group">
                      <label className="form-label">Specialty *</label>
                      <select className="form-select" id="reg-specialty">
                        <option value="">Select specialty</option>
                        <option>Cardiology</option>
                        <option>Neurology</option>
                        <option>General Physician</option>
                        <option>Orthopedics</option>
                        <option>Gynecology</option>
                        <option>Dermatology</option>
                        <option>Pediatrics</option>
                        <option>Psychiatry</option>
                      </select>
                    </div>
                  )}
                  {role === 'pharmacy' && (
                    <div className="form-group">
                      <label className="form-label">Pharmacy Name *</label>
                      <input className="form-input" placeholder="MedPlus Pharmacy" id="reg-pharmacy-name" />
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2: ABHA Identity */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="abha-option-card">
                    <div className="abha-option-card__header">
                      <input type="radio" name="abha-choice" id="abha-link" defaultChecked />
                      <label htmlFor="abha-link">
                        <strong>Link existing ABHA ID</strong>
                        <span>Already have a 14-digit ABHA ID from ABDM</span>
                      </label>
                    </div>
                    <input className="form-input" placeholder="14-XXXX-XXXX-XXXX" style={{ marginTop: 'var(--space-3)' }} id="reg-abha-id" />
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-3)' }}>
                      Verify via ABDM →
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', margin: 'var(--space-6) 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                    <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                  </div>

                  <div className="abha-option-card">
                    <div className="abha-option-card__header">
                      <input type="radio" name="abha-choice" id="abha-create" />
                      <label htmlFor="abha-create">
                        <strong>Generate new ABHA</strong>
                        <span>We'll create one for you — takes 2 minutes</span>
                      </label>
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--space-3)' }}>
                      Don't have an ABHA ID? We'll generate a new one linked to your phone number, compliant with India's Ayushman Bharat Digital Mission.
                    </p>
                  </div>

                  {role === 'doctor' && (
                    <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                      <label className="form-label">Medical License / MCI Registration Number *</label>
                      <input className="form-input" placeholder="MCI-XXXXX or State Medical Council Reg No." id="reg-license" />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input className="form-input" placeholder="Flat/Building, Street, City" id="reg-address" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                      <select className="form-select" id="reg-state">
                        <option value="">State</option>
                        <option>Maharashtra</option>
                        <option>Delhi</option>
                        <option>Karnataka</option>
                        <option>Tamil Nadu</option>
                        <option>Gujarat</option>
                        <option>West Bengal</option>
                        <option>Uttar Pradesh</option>
                        <option>Telangana</option>
                        <option>Kerala</option>
                        <option>Rajasthan</option>
                      </select>
                      <input className="form-input" placeholder="PIN Code" id="reg-pincode" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Account Security */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" placeholder="Min 8 characters, 1 uppercase, 1 number" id="reg-password" />
                    <div className="password-strength-bar">
                      <div className="password-strength-fill" style={{ width: '0%', background: 'var(--color-gray-300)' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <input className="form-input" type="password" placeholder="Re-enter your password" id="reg-confirm-password" />
                  </div>

                  <div className="terms-checkbox">
                    <input type="checkbox" id="reg-terms" />
                    <label htmlFor="reg-terms">
                      I agree to MedVault's <a href="#" style={{ color: 'var(--color-primary-500)' }}>Terms of Service</a>,{' '}
                      <a href="#" style={{ color: 'var(--color-primary-500)' }}>Privacy Policy</a>, and consent to my health data being stored
                      as per <a href="#" style={{ color: 'var(--color-primary-500)' }}>ABDM guidelines</a>.
                    </label>
                  </div>

                  <div className="whatsapp-consent">
                    <input type="checkbox" id="reg-whatsapp" defaultChecked />
                    <label htmlFor="reg-whatsapp">
                      Send me prescription alerts and medication reminders via WhatsApp
                    </label>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="auth-form__nav">
              {step > 1 && (
                <button type="button" className="btn btn-ghost btn-md" onClick={handleBack}>
                  <ArrowLeft size={18} /> Back
                </button>
              )}
              {step < 3 ? (
                <button type="button" className="btn btn-primary btn-lg" onClick={handleNext} style={{ flex: 1 }}>
                  Continue <ArrowRight size={18} />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} id="register-submit">
                  Create Account <Check size={18} />
                </button>
              )}
            </div>
          </form>

          <p className="auth-form__footer">
            Already have an account? <Link to="/login">Log in →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}