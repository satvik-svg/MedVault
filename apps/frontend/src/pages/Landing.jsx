import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Shield, ShieldCheck, QrCode, Activity, Zap,
  Brain, ArrowUpRight, Smartphone, Bot, Clock,
  FileText, AlertTriangle, FlaskConical, Calendar,
  Search, ArrowRight, Sparkles, CheckCircle, Lock
} from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import './Landing.css'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
}

const stagger = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

const services = [
  { icon: <Shield size={28} />, name: 'Drug Safety', desc: 'Real-time interaction checking for every new prescription. Prevents adverse drug events before they happen.', color: '#2563eb', bg: '#eff6ff' },
  { icon: <Brain size={28} />, name: 'AI Diagnosis', desc: 'Symptom analysis with XGBoost, calibrated for Indian diseases — Dengue, Typhoid, Malaria and more.', color: '#6d28d9', bg: '#f5f3ff' },
  { icon: <FileText size={28} />, name: 'Health Records', desc: 'Unified timeline of all records, labs, and prescriptions. Blockchain-verified and tamper-proof.', color: '#0284c7', bg: '#f0f9ff' },
  { icon: <Zap size={28} />, name: 'Lab Report OCR', desc: 'Photograph any paper report — structured data extracted in seconds via AI OCR pipeline.', color: '#d97706', bg: '#fffbeb' },
  { icon: <Smartphone size={28} />, name: 'WhatsApp Integration', desc: 'Records and medication reminders delivered directly to patient WhatsApp.', color: '#16a34a', bg: '#f0fdf4' },
]

const features = [
  { icon: <ShieldCheck size={24} />, title: 'Blockchain Secured', desc: 'Every prescription is hashed and stored on-chain. Immutable, tamper-proof.' },
  { icon: <Bot size={24} />, title: 'AI Interaction Check', desc: 'XGBoost-powered drug interaction detection in under 200ms.' },
  { icon: <Zap size={24} />, title: '<200ms Response', desc: 'Lightning-fast API responses. Real-time drug safety while doctors type.' },
  { icon: <Smartphone size={24} />, title: 'WhatsApp Alerts', desc: 'Patients get prescriptions and alerts via WhatsApp + push.' },
]

export default function Landing() {
  return (
    <div className="landing">
      <Navbar />
      <HeroSection />
      <QuickAccess />
      <HowItWorks />
      <Services />
      <WhyMedVault />
      <CTABanner />
      <Footer />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="hero" id="hero">
      <div className="container hero__inner">
        <motion.div className="hero__text" {...fadeUp}>
          <div className="hero__badge"><Sparkles size={14} /><span>Enterprise Healthcare Infrastructure</span></div>
          <h1 className="hero__title">Smart Health,<br /><span className="hero__title-accent text-primary">Safer Care</span></h1>
          <p className="hero__subtitle">Clinical-grade drug interaction detection, blockchain-verified prescriptions, and seamless patient-doctor connectivity.</p>
          <div className="hero__actions">
            <Link to="/register" className="btn btn-primary btn-lg" id="hero-cta">Get Started</Link>
            <a href="#how-it-works" className="btn btn-outline btn-lg">Learn More<ArrowRight size={18} /></a>
          </div>
          <div className="hero__trust-label">
            <CheckCircle size={16} className="text-primary" /> Trusted by top healthcare institutions
          </div>
        </motion.div>
        
        <div className="hero__visual">
          <motion.div
            className="mock-ui-wrapper"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mock-ui-card">
              <div className="mock-ui-header">
                <div className="mock-ui-dots">
                  <span/><span/><span/>
                </div>
                <div className="mock-ui-title">New Prescription</div>
              </div>
              <div className="mock-ui-body">
                <div className="mock-ui-patient">
                  <div className="mock-ui-avatar">JD</div>
                  <div>
                    <div className="mock-ui-name">John Doe</div>
                    <div className="mock-ui-meta">ABHA: 91-XXXX-XXXX-XXXX</div>
                  </div>
                </div>
                
                <div className="mock-ui-drugs">
                  <div className="mock-ui-drug">
                    <div className="mock-ui-drug-name">Amoxicillin 500mg</div>
                    <div className="mock-ui-drug-status safe"><CheckCircle size={14}/> Safe</div>
                  </div>
                  <div className="mock-ui-drug">
                    <div className="mock-ui-drug-name">Ibuprofen 400mg</div>
                    <div className="mock-ui-drug-status safe"><CheckCircle size={14}/> Safe</div>
                  </div>
                </div>

                <motion.div 
                  className="mock-ui-securing"
                  initial={{ backgroundPosition: '200% center' }}
                  animate={{ backgroundPosition: '-200% center' }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Lock size={14}/> Anchoring to Blockchain...
                </motion.div>
              </div>
            </div>
            
            <motion.div 
              className="mock-ui-floating"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="mock-ui-floating-icon"><Activity size={18} color="#16a34a"/></div>
              <div>
                <div className="mock-ui-floating-title">Interaction Check</div>
                <div className="mock-ui-floating-desc">120ms latency</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function QuickAccess() {
  const items = [
    { icon: <FlaskConical size={28} />, title: 'Lab Network', desc: 'Order tests through verified partner labs and track reports', color: '#0369a1', bg: '#f0f9ff' },
    { icon: <Calendar size={28} />, title: 'Walk-in Visit', desc: 'Check in quickly and let doctors open the right health context', color: '#1d4ed8', bg: '#eff6ff' },
    { icon: <Search size={28} />, title: 'Find Doctor', desc: 'Search by specialty, location, or availability', color: '#4338ca', bg: '#eef2ff' },
  ]
  return (
    <section className="quick-access section-padding">
      <div className="container">
        <div className="quick-access__grid">
          {items.map((item, i) => (
            <motion.div key={item.title} className="quick-card" {...stagger} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <div className="quick-card__icon" style={{ background: item.bg, color: item.color }}>{item.icon}</div>
              <div className="quick-card__content"><h3>{item.title}</h3><p>{item.desc}</p></div>
              <ArrowUpRight size={20} className="quick-card__arrow" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { step: '01', icon: <QrCode size={28} />, title: 'Patient Shows QR', desc: 'Patient presents ABHA-linked QR code. Doctor scans to load medical history, allergies, and active meds.' },
    { step: '02', icon: <AlertTriangle size={28} />, title: 'AI Checks Interactions', desc: 'XGBoost cross-references drugs against active medications via DrugBank + OpenFDA in <200ms.' },
    { step: '03', icon: <Shield size={28} />, title: 'Blockchain Verified', desc: 'Approved prescriptions are SHA-256 hashed and anchored to the blockchain. WhatsApp + push notifications sent.' },
  ]
  return (
    <section className="how-it-works section-padding" id="how-it-works">
      <div className="container">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-label">How It Works</span>
          <h2 className="section-title">Three Simple Steps to<br /><span className="text-primary">Safer Prescriptions</span></h2>
        </motion.div>
        <div className="steps-grid">
          <div className="steps-timeline" />
          {steps.map((item, i) => (
            <motion.div key={item.step} className="step-card" {...stagger} transition={{ duration: 0.6, delay: i * 0.15 }}>
              <div className="step-card__number">{item.step}</div>
              <div className="step-card__icon">{item.icon}</div>
              <h3 className="step-card__title">{item.title}</h3>
              <p className="step-card__desc">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Services() {
  return (
    <section className="services section-padding" id="services">
      <div className="container">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-label">Our Services</span>
          <h2 className="section-title">Comprehensive <span className="text-primary">Healthcare Services</span></h2>
        </motion.div>
        <div className="services-grid">
          {services.map((svc, i) => (
            <motion.div key={svc.name} className="service-card" {...stagger} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <div className="service-card__icon" style={{ color: svc.color, background: svc.bg }}>{svc.icon}</div>
              <h3 className="service-card__name">{svc.name}</h3>
              <p className="service-card__desc">{svc.desc}</p>
              <button className="service-card__link">Learn More <ArrowUpRight size={16} /></button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyMedVault() {
  return (
    <section className="why-medvault section-padding" id="why-medvault">
      <div className="container">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-label">Why MedVault</span>
          <h2 className="section-title">Built for <span className="text-primary">Safety & Trust</span></h2>
        </motion.div>
        <div className="features-grid">
          {features.map((feat, i) => (
            <motion.div key={feat.title} className="feature-card" {...stagger} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <div className="feature-card__icon">{feat.icon}</div>
              <div className="feature-card__text">
                <h3 className="feature-card__title">{feat.title}</h3>
                <p className="feature-card__desc">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTABanner() {
  return (
    <section className="cta-banner section-padding">
      <div className="container">
        <motion.div className="cta-banner__inner" {...fadeUp}>
          <h2>Transform Your <span className="text-white-accent">Health Journey</span> Today</h2>
          <p>Join the institutions trusting MedVault for safer, smarter healthcare infrastructure.</p>
          <div className="cta-banner__actions">
            <Link to="/register" className="btn btn-white btn-lg">Get Started Free<ArrowRight size={18} /></Link>
            <Link to="/login" className="btn btn-lg cta-banner__secondary-btn">Sign In</Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
