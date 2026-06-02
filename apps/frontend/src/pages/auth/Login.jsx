import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, User, Stethoscope, FlaskConical, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../lib/api.js'
import { useAuthStore } from '../../stores/index.js'
import './Auth.css'

const roles = [
  { id: 'patient', label: 'Patient', icon: <User size={20} /> },
  { id: 'doctor', label: 'Doctor', icon: <Stethoscope size={20} /> },
  { id: 'lab', label: 'Lab', icon: <FlaskConical size={20} /> },
]

export default function Login() {
  const [role, setRole] = useState('patient')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const dashboardRoutes = { PATIENT: '/patient/dashboard', DOCTOR: '/doctor/dashboard', LAB_OPERATOR: '/lab/dashboard' }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const session = await authApi.login(form.email.trim(), form.password)
      const userRole = session.user?.role
      const expectedRole = role === 'lab' ? 'LAB_OPERATOR' : role.toUpperCase()
      if (userRole && userRole !== expectedRole) {
        toast.error(`This account is registered as ${userRole.toLowerCase().replace('_', ' ')}`)
      }
      login(session.user, session.accessToken, userRole)
      navigate(dashboardRoutes[userRole] || '/patient/dashboard', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Login failed')
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

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                id="login-email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="auth-password-wrapper">
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  id="login-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="auth-form__options">
              <label className="auth-checkbox"><input type="checkbox" /><span>Remember me</span></label>
              <a href="#" className="auth-forgot">Forgot password?</a>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} id="login-submit" disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
              {loading ? 'Logging in...' : 'Log In'}
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
