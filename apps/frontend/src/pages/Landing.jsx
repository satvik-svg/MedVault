import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Shield, ShieldCheck, Stethoscope, QrCode, Activity, Zap,
  Heart, Brain, Baby, ArrowUpRight, Star, Quote,
  Smartphone, Bot, Clock, ChevronRight, Users, FileText,
  AlertTriangle, CheckCircle, FlaskConical, Calendar, Search,
  ArrowRight, Sparkles
} from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import './Landing.css'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6 },
}

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

const services = [
  { icon: <Shield size={32} />, name: 'Drug Safety', desc: 'Real-time interaction checking for every new prescription. Prevents adverse drug events before they happen.', color: '#2563EB' },
  { icon: <Brain size={32} />, name: 'AI Diagnosis', desc: 'Symptom analysis with XGBoost, calibrated for Indian diseases — Dengue, Typhoid, Malaria and more.', color: '#7c3aed' },
  { icon: <FileText size={32} />, name: 'Health Records', desc: 'Unified timeline of all records, labs, and prescriptions. Blockchain-verified and tamper-proof.', color: '#0ea5e9' },
  { icon: <Zap size={32} />, name: 'Lab Report OCR', desc: 'Photograph any paper report — structured data extracted in seconds via AI OCR pipeline.', color: '#f59e0b' },
  { icon: <Smartphone size={32} />, name: 'WhatsApp Integration', desc: 'Records and medication reminders delivered directly to patient WhatsApp.', color: '#16a34a' },
]

const doctors = [
  { name: 'Dr. Priya Sharma', specialty: 'Cardiologist', location: 'Mumbai', rating: 4.9, available: true },
  { name: 'Dr. Rajesh Gupta', specialty: 'Neurologist', location: 'Delhi', rating: 4.8, available: true },
  { name: 'Dr. Ananya Patel', specialty: 'Gynecologist', location: 'Bengaluru', rating: 4.9, available: false },
]

const features = [
  { icon: <ShieldCheck size={28} />, title: 'Blockchain Secured', desc: 'Every prescription is hashed and stored on-chain. Immutable, tamper-proof.' },
  { icon: <Bot size={28} />, title: 'AI Interaction Check', desc: 'XGBoost-powered drug interaction detection in under 200ms.' },
  { icon: <Zap size={28} />, title: '<200ms Response', desc: 'Lightning-fast API responses. Real-time drug safety while doctors type.' },
  { icon: <Smartphone size={28} />, title: 'WhatsApp Alerts', desc: 'Patients get prescriptions and alerts via WhatsApp + push.' },
]

const testimonials = [
  { name: 'Dr. Meera Krishnan', role: 'Cardiologist', quote: 'MedVault has transformed how I prescribe. The real-time interaction alerts prevented major conflicts.', avatar: '👩‍⚕️' },
  { name: 'Rahul Verma', role: 'Patient', quote: 'I feel safer knowing my prescriptions are checked for interactions and stored on blockchain.', avatar: '👨' },
  { name: 'Dr. Suresh Reddy', role: 'Physician', quote: 'The prescription workflow is incredibly intuitive. Drug autocomplete saves me 10+ minutes per patient.', avatar: '👨‍⚕️' },
]

export default function Landing() {
  return (
    <div className="landing">
      <Navbar />
      <HeroSection />
      <QuickAccess />
      <HowItWorks />
      <Services />
      <Doctors />
      <WhyMedVault />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="hero" id="hero">
      <div className="hero__blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <div className="container hero__inner">
        <motion.div className="hero__text" {...fadeUp}>
          <div className="hero__badge"><Sparkles size={14} /><span>India's First Blockchain Healthcare Platform</span></div>
          <h1 className="hero__title">Smart Health,<br /><span className="hero__title-accent">Safer Care</span></h1>
          <p className="hero__subtitle">AI-powered drug interaction detection, blockchain-verified prescriptions, and seamless patient-doctor connectivity through ABHA ID.</p>
          <div className="hero__actions">
            <Link to="/register" className="btn btn-primary btn-lg" id="hero-cta"><Calendar size={18} />Start Visit</Link>
            <a href="#how-it-works" className="btn btn-outline btn-lg">Learn More<ArrowRight size={18} /></a>
          </div>
          <div className="hero__trust">
            <div className="hero__trust-avatars">
              {['👨‍⚕️','👩‍⚕️','👨','👩','🧑‍⚕️'].map((e, i) => <span key={i} className="hero__trust-avatar">{e}</span>)}
            </div>
            <div><strong>9,998+</strong> patients trust MedVault
              <div className="hero__trust-stars">{[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}</div>
            </div>
          </div>
        </motion.div>
        <div className="hero__visual">
          <motion.div className="hero__visual-main" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="hero__doctor-card">
              <div className="hero__doctor-img">🩺</div>
              <div className="hero__doctor-info"><h3>24 Hour Doctor</h3><p>We provide the best medical services with real-time drug safety checks</p></div>
            </div>
          </motion.div>
          <motion.div className="floating-card floating-card-1" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <div className="floating-card__icon" style={{ background: 'rgba(0,181,181,0.1)', color: 'var(--color-primary-500)' }}><Users size={20} /></div>
            <div><span className="floating-card__label">Online Queue</span><span className="floating-card__value">55</span></div>
          </motion.div>
          <motion.div className="floating-card floating-card-2" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
            <div className="floating-card__icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-gold)' }}><Activity size={20} /></div>
            <div><span className="floating-card__label">Steps</span><span className="floating-card__value">9,998</span></div>
          </motion.div>
          <motion.div className="floating-card floating-card-3" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, delay: 0.8, repeat: Infinity, ease: 'easeInOut' }}>
            <div className="floating-card__icon" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--color-safe)' }}><ShieldCheck size={20} /></div>
            <div><span className="floating-card__label">Verified Rx</span><span className="floating-card__value">2,847</span></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function QuickAccess() {
  const items = [
    { icon: <FlaskConical size={28} />, title: 'Lab Network', desc: 'Order tests through verified partner labs and track reports', color: '#0f766e', bg: '#ecfdf5' },
    { icon: <Calendar size={28} />, title: 'Walk-in Visit', desc: 'Check in quickly and let doctors open the right health context', color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)' },
    { icon: <Search size={28} />, title: 'Find Doctor', desc: 'Search by specialty, location, or availability', color: 'var(--color-secondary-600)', bg: '#eff6ff' },
  ]
  return (
    <section className="quick-access section-padding">
      <div className="container">
        <div className="quick-access__grid">
          {items.map((item, i) => (
            <motion.div key={item.title} className="quick-card" {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }}>
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
    { step: '01', icon: <QrCode size={32} />, title: 'Patient Shows QR', desc: 'Patient presents ABHA-linked QR code. Doctor scans to load medical history, allergies, and active meds.' },
    { step: '02', icon: <AlertTriangle size={32} />, title: 'AI Checks Interactions', desc: 'XGBoost cross-references drugs against active medications via DrugBank + OpenFDA in <200ms.' },
    { step: '03', icon: <Shield size={32} />, title: 'Blockchain Verified', desc: 'Approved prescriptions are SHA-256 hashed and anchored to the blockchain. WhatsApp + push notifications sent.' },
  ]
  return (
    <section className="how-it-works section-padding" id="how-it-works">
      <div className="container">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-label">How It Works</span>
          <h2 className="section-title">Three Simple Steps to<br /><span className="text-teal">Safer Prescriptions</span></h2>
        </motion.div>
        <div className="steps-grid">
          {steps.map((item, i) => (
            <motion.div key={item.step} className="step-card" {...stagger} transition={{ duration: 0.5, delay: i * 0.15 }}>
              <div className="step-card__number">{item.step}</div>
              <div className="step-card__icon">{item.icon}</div>
              <h3 className="step-card__title">{item.title}</h3>
              <p className="step-card__desc">{item.desc}</p>
              {i < 2 && <div className="step-card__connector"><ChevronRight size={20} /></div>}
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
          <h2 className="section-title">Comprehensive <span className="text-teal">Healthcare Services</span></h2>
        </motion.div>
        <div className="services-grid">
          {services.map((svc, i) => (
            <motion.div key={svc.name} className="service-card" {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }} whileHover={{ y: -8 }}>
              <div className="service-card__icon" style={{ color: svc.color, background: `${svc.color}12` }}>{svc.icon}</div>
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

function Doctors() {
  return (
    <section className="doctors section-padding" id="doctors">
      <div className="container">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-label">Available Doctors</span>
          <h2 className="section-title">Meet Our <span className="text-teal">Expert Doctors</span></h2>
        </motion.div>
        <div className="doctors-grid">
          {doctors.map((doc, i) => (
            <motion.div key={doc.name} className="doctor-card" {...stagger} transition={{ duration: 0.5, delay: i * 0.15 }}>
              <div className="doctor-card__avatar"><span className="doctor-card__avatar-emoji">{i === 0 ? '👩‍⚕️' : i === 1 ? '👨‍⚕️' : '👩‍⚕️'}</span></div>
              <div className="doctor-card__info">
                <h3>{doc.name}</h3>
                <p className="doctor-card__specialty">{doc.specialty}</p>
                <p className="doctor-card__location">{doc.location}</p>
                <div className="doctor-card__meta">
                  <div className="doctor-card__rating"><Star size={14} fill="#f59e0b" color="#f59e0b" /><span>{doc.rating}</span></div>
                  <span className={`badge ${doc.available ? 'badge-safe' : 'badge-teal'}`}>{doc.available ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
              <button className="btn btn-outline btn-sm">View Doctor</button>
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
          <h2 className="section-title">Built for <span className="text-teal">Safety & Trust</span></h2>
        </motion.div>
        <div className="features-grid">
          {features.map((feat, i) => (
            <motion.div key={feat.title} className="feature-card" {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }}>
              <div className="feature-card__icon">{feat.icon}</div>
              <h3 className="feature-card__title">{feat.title}</h3>
              <p className="feature-card__desc">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="testimonials section-padding">
      <div className="container">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-label">Testimonials</span>
          <h2 className="section-title">Our Patients' <span className="text-teal">Valuable Words</span></h2>
        </motion.div>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} className="testimonial-card" {...stagger} transition={{ duration: 0.5, delay: i * 0.15 }}>
              <Quote size={24} className="testimonial-card__quote-icon" />
              <p className="testimonial-card__text">{t.quote}</p>
              <div className="testimonial-card__author">
                <span className="testimonial-card__avatar">{t.avatar}</span>
                <div><strong>{t.name}</strong><span className="testimonial-card__role">{t.role}</span></div>
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
          <h2>It's Time to Change Your <span className="text-white-accent">Health Journey</span></h2>
          <p>Join thousands who trust MedVault for safer prescriptions.</p>
          <div className="cta-banner__actions">
            <Link to="/register" className="btn btn-white btn-lg">Get Started<ArrowRight size={18} /></Link>
            <Link to="/login" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.3)' }}>Contact Us</Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
