import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, User, Stethoscope, ShoppingBag, ArrowRight } from 'lucide-react'
import './Auth.css'

const roles = [
  { id: 'patient', label: 'Patient', icon: <User size={20} /> },
  { id: 'doctor', label: 'Doctor', icon: <Stethoscope size={20} /> },
  { id: 'pharmacy', label: 'Pharmacy', icon: <ShoppingBag size={20} /> },
]

export default function Register() {
  const [role, setRole] = useState('patient')

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__left-content">
          <div className="auth-page__left-blobs"><div className="blob blob-1" /><div className="blob blob-2" /></div>
          <Link to="/" className="auth-page__logo"><div className="navbar__logo-icon"><Shield size={24} /></div><span className="navbar__logo-text">MedVault</span></Link>
          <h2 className="auth-page__left-title">Join the future of<br />healthcare</h2>
          <p className="auth-page__left-desc">Create your account and experience blockchain-secured healthcare today.</p>
        </div>
      </div>
      <div className="auth-page__right">
        <motion.div className="auth-form-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="auth-form__title">Create Account</h1>
          <p className="auth-form__subtitle">Get started with MedVault</p>
          <div className="auth-role-selector">
            {roles.map((r) => (
              <button key={r.id} className={`auth-role-btn ${role === r.id ? 'auth-role-btn--active' : ''}`} onClick={() => setRole(r.id)}>
                {r.icon}<span>{r.label}</span>
              </button>
            ))}
          </div>
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">First Name</label><input className="form-input" placeholder="John" /></div>
              <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" placeholder="Doe" /></div>
            </div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@example.com" /></div>
            {role === 'patient' && (
              <div className="form-group"><label className="form-label">ABHA ID (Optional)</label><input className="form-input" placeholder="14-XXXX-XXXX-XXXX" /></div>
            )}
            {role === 'doctor' && (
              <div className="form-group"><label className="form-label">Medical License Number</label><input className="form-input" placeholder="MCI-XXXXX" /></div>
            )}
            <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="Min 8 characters" /></div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Create Account<ArrowRight size={18} /></button>
          </form>
          <p className="auth-form__footer">Already have an account? <Link to="/login">Log in →</Link></p>
        </motion.div>
      </div>
    </div>
  )
}
