import { Link } from 'react-router-dom'
import { Shield, Mail, Phone, MapPin, Globe, MessageCircle, ExternalLink } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
              <img src="/logo-removebg-preview.png" alt="MedVault Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <span className="navbar__logo-text">MedVault</span>
            </div>
            <p className="footer__desc">
              Blockchain-secured healthcare platform with AI-powered drug interaction checks. Your health, protected and connected.
            </p>
            <div className="footer__socials">
              <a href="#" className="footer__social-link" aria-label="GitHub"><Globe size={18} /></a>
              <a href="#" className="footer__social-link" aria-label="Twitter"><MessageCircle size={18} /></a>
              <a href="#" className="footer__social-link" aria-label="LinkedIn"><ExternalLink size={18} /></a>
            </div>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Product</h4>
            <a href="#how-it-works" className="footer__link">How It Works</a>
            <a href="#services" className="footer__link">Services</a>
            <a href="#why-medvault" className="footer__link">Why MedVault</a>
            <Link to="/register" className="footer__link">Get Started</Link>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Support</h4>
            <a href="#" className="footer__link">Help Center</a>
            <a href="#" className="footer__link">Documentation</a>
            <a href="#" className="footer__link">API Reference</a>
            <a href="#" className="footer__link">Status Page</a>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Security</h4>
            <a href="#" className="footer__link">Blockchain Audit</a>
            <a href="#" className="footer__link">Privacy Policy</a>
            <a href="#" className="footer__link">Terms of Service</a>
            <a href="#" className="footer__link">HIPAA Compliance</a>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Contact</h4>
            <div className="footer__contact-item">
              <Mail size={14} />
              <span>support@medvault.health</span>
            </div>
            <div className="footer__contact-item">
              <Phone size={14} />
              <span>+91 1800-MEDVAULT</span>
            </div>
            <div className="footer__contact-item">
              <MapPin size={14} />
              <span>Bengaluru, India</span>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© 2025 MedVault Healthcare Technologies. All rights reserved.</p>
          <p>Secured by Blockchain · Powered by AI</p>
        </div>
      </div>
    </footer>
  )
}
