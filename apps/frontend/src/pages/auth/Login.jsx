import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, User, Stethoscope, FlaskConical, Eye, EyeOff, ArrowRight } from 'lucide-react'
import './Auth.css'

const roles = [
  { id: 'patient', label: 'Patient', icon: <User size={20} /> },
  { id: 'doctor', label: 'Doctor', icon: <Stethoscope size={20} /> },
  { id: 'lab', label: 'Lab', icon: <FlaskConical size={20} /> },
]

export default function Login() {
  const [role, setRole] = useState('patient')
  const [showPassword, setShowPassword] = useState(false)

  const dashboardRoutes = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', lab: '/lab/dashboard' }

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
          <h2 className="auth-page__left-title">Your health, secured<br />and connected</h2>
          <p className="auth-page__left-desc">Blockchain-verified prescriptions. AI-powered safety. Seamless care.</p>
          <div className="auth-page__left-stats">
            <motion.div className="auth-stat-card" animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <span className="auth-stat-card__value">9,998+</span>
              <span className="auth-stat-card__label">Patients Trust Us</span>
            </motion.div>
            <motion.div className="auth-stat-card" animate={{ y: [0, -6, 0] }} transition={{ duration: 4, delay: 1.5, repeat: Infinity }}>
              <span className="auth-stat-card__value">97.3%</span>
              <span className="auth-stat-card__label">AI Accuracy</span>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="auth-page__right">
        <motion.div className="auth-form-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="auth-form__title">Welcome back</h1>
          <p className="auth-form__subtitle">Sign in to your MedVault account</p>

          <div className="auth-role-selector">
            {roles.map((r) => (
              <button key={r.id} className={`auth-role-btn ${role === r.id ? 'auth-role-btn--active' : ''}`} onClick={() => setRole(r.id)}>
                {r.icon}<span>{r.label}</span>
              </button>
            ))}
          </div>

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); window.location.href = dashboardRoutes[role] }}>
            <div className="form-group">
              <label className="form-label">Email or ABHA ID</label>
              <input className="form-input" type="text" placeholder="you@example.com or 14-XXXX-XXXX-XXXX" id="login-email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="auth-password-wrapper">
                <input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="••••••••" id="login-password" />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="auth-form__options">
              <label className="auth-checkbox"><input type="checkbox" /><span>Remember me</span></label>
              <a href="#" className="auth-forgot">Forgot password?</a>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} id="login-submit">
              Log In<ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-form__footer">
            Don't have an account? <Link to="/register">Register →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
