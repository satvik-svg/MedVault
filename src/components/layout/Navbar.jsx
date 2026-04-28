import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './Navbar.css'

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Doctors', href: '#doctors' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Why MedVault', href: '#why-medvault' },
  { label: 'Support', href: '#footer' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo" id="logo-link">
          <div className="navbar__logo-icon">
            <Shield size={28} />
          </div>
          <span className="navbar__logo-text">MedVault</span>
        </Link>

        {isLanding && (
          <div className="navbar__links">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="navbar__link">
                {link.label}
              </a>
            ))}
          </div>
        )}

        <div className="navbar__actions">
          <Link to="/login" className="btn btn-ghost btn-sm" id="nav-login-btn">
            Log in
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm" id="nav-get-started-btn">
            Get Started
          </Link>
        </div>

        <button
          className="navbar__hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          id="mobile-menu-toggle"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="navbar__mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isLanding &&
              navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="navbar__mobile-link"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            <div className="navbar__mobile-actions">
              <Link to="/login" className="btn btn-ghost btn-md" style={{ width: '100%' }}>
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-md" style={{ width: '100%' }}>
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
