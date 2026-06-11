import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Stethoscope, FlaskConical, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../lib/api.js'
import './Auth.css'

const roles = [
  { id: 'patient', label: 'Patient', icon: <User size={20} /> },
  { id: 'doctor', label: 'Doctor', icon: <Stethoscope size={20} /> },
  { id: 'lab', label: 'Lab', icon: <FlaskConical size={20} /> },
]

const stepLabels = ['Basic Info', 'Identity', 'Account']

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  specialty: '',
  labName: '',
  abhaId: '',
  address: '',
  state: '',
  pincode: '',
  nmcRegNumber: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
  whatsappConsent: true,
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('patient')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const passwordScore = [
    form.password.length >= 8,
    /[A-Z]/.test(form.password),
    /\d/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password),
  ].filter(Boolean).length

  const passwordStrength = [
    { width: '0%', background: 'var(--color-gray-300)' },
    { width: '25%', background: 'var(--color-severe)' },
    { width: '50%', background: 'var(--color-moderate)' },
    { width: '75%', background: 'var(--color-secondary-500)' },
    { width: '100%', background: 'var(--color-safe)' },
  ][passwordScore]

  const validateStep = (targetStep = step) => {
    if (targetStep === 1) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
        toast.error('Please fill in your name, email, and phone number')
        return false
      }
      if (role === 'doctor' && !form.specialty) {
        toast.error('Please select your specialty')
        return false
      }
      if (role === 'lab' && !form.labName.trim()) {
        toast.error('Please enter the lab name')
        return false
      }
    }

    if (targetStep === 2 && role === 'doctor' && !form.nmcRegNumber.trim()) {
      toast.error('Please enter your medical registration number')
      return false
    }

    if (targetStep === 3) {
      if (form.password.length < 8) {
        toast.error('Password must be at least 8 characters')
        return false
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match')
        return false
      }
      if (!form.acceptedTerms) {
        toast.error('Please accept the terms to continue')
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep(s => Math.min(s + 1, 3))
  }
  const handleBack = () => setStep(s => Math.max(s - 1, 1))
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(3)) return

    setLoading(true)
    try {
      await authApi.register({
        role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        abhaId: form.abhaId.trim(),
        address: form.address.trim(),
        state: form.state,
        pincode: form.pincode.trim(),
        specialty: form.specialty,
        nmcRegNumber: form.nmcRegNumber.trim(),
        stateMedicalCouncil: form.state,
        labName: form.labName.trim(),
        whatsappConsent: form.whatsappConsent,
      })
      toast.success('Account created. You can log in now.')
      navigate('/login', { replace: true, state: { email: form.email.trim() } })
    } catch (error) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__left-content">

          <Link to="/" className="auth-page__logo">
            <img src="/logo-removebg-preview.png" alt="MedVault Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
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
                type="button"
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
                      <input
                        className="form-input"
                        placeholder="John"
                        id="reg-firstname"
                        value={form.firstName}
                        onChange={(event) => updateField('firstName', event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        className="form-input"
                        placeholder="Doe"
                        id="reg-lastname"
                        value={form.lastName}
                        onChange={(event) => updateField('lastName', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="you@example.com"
                      id="reg-email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      className="form-input"
                      type="tel"
                      placeholder="+91 98765 43210"
                      id="reg-phone"
                      value={form.phoneNumber}
                      onChange={(event) => updateField('phoneNumber', event.target.value)}
                    />
                  </div>
                  {role === 'doctor' && (
                    <div className="form-group">
                      <label className="form-label">Specialty *</label>
                      <select
                        className="form-select"
                        id="reg-specialty"
                        value={form.specialty}
                        onChange={(event) => updateField('specialty', event.target.value)}
                      >
                        <option value="">Select specialty</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="General Physician">General Physician</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Gynecology">Gynecology</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Psychiatry">Psychiatry</option>
                      </select>
                    </div>
                  )}
                  {role === 'lab' && (
                    <div className="form-group">
                      <label className="form-label">Lab Name *</label>
                      <input
                        className="form-input"
                        placeholder="Sharma Pathology"
                        id="reg-lab-name"
                        value={form.labName}
                        onChange={(event) => updateField('labName', event.target.value)}
                      />
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
                    <input
                      className="form-input"
                      placeholder="14-XXXX-XXXX-XXXX"
                      style={{ marginTop: 'var(--space-3)' }}
                      id="reg-abha-id"
                      value={form.abhaId}
                      onChange={(event) => updateField('abhaId', event.target.value)}
                    />
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
                      <input
                        className="form-input"
                        placeholder="MCI-XXXXX or State Medical Council Reg No."
                        id="reg-license"
                        value={form.nmcRegNumber}
                        onChange={(event) => updateField('nmcRegNumber', event.target.value)}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input
                      className="form-input"
                      placeholder="Flat/Building, Street, City"
                      id="reg-address"
                      value={form.address}
                      onChange={(event) => updateField('address', event.target.value)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                      <select
                        className="form-select"
                        id="reg-state"
                        value={form.state}
                        onChange={(event) => updateField('state', event.target.value)}
                      >
                        <option value="">State</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Rajasthan">Rajasthan</option>
                      </select>
                      <input
                        className="form-input"
                        placeholder="PIN Code"
                        id="reg-pincode"
                        value={form.pincode}
                        onChange={(event) => updateField('pincode', event.target.value)}
                      />
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
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Min 8 characters, 1 uppercase, 1 number"
                      id="reg-password"
                      value={form.password}
                      onChange={(event) => updateField('password', event.target.value)}
                    />
                    <div className="password-strength-bar">
                      <div className="password-strength-fill" style={passwordStrength} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Re-enter your password"
                      id="reg-confirm-password"
                      value={form.confirmPassword}
                      onChange={(event) => updateField('confirmPassword', event.target.value)}
                    />
                  </div>

                  <div className="terms-checkbox">
                    <input
                      type="checkbox"
                      id="reg-terms"
                      checked={form.acceptedTerms}
                      onChange={(event) => updateField('acceptedTerms', event.target.checked)}
                    />
                    <label htmlFor="reg-terms">
                      I agree to MedVault's <a href="#" style={{ color: 'var(--color-primary-500)' }}>Terms of Service</a>,{' '}
                      <a href="#" style={{ color: 'var(--color-primary-500)' }}>Privacy Policy</a>, and consent to my health data being stored
                      as per <a href="#" style={{ color: 'var(--color-primary-500)' }}>ABDM guidelines</a>.
                    </label>
                  </div>

                  <div className="whatsapp-consent">
                    <input
                      type="checkbox"
                      id="reg-whatsapp"
                      checked={form.whatsappConsent}
                      onChange={(event) => updateField('whatsappConsent', event.target.checked)}
                    />
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
                <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} id="register-submit" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                  {loading ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
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
