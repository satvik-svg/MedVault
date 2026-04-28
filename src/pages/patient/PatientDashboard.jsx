import { motion } from 'framer-motion'
import { Home, FileText, Pill, QrCode, Bell, Settings, Activity, Heart, AlertTriangle, Hash, Calendar, Clock, Shield } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import './Dashboard.css'

const sidebarItems = [
  { path: '/patient/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/patient/records', label: 'My Records', icon: <FileText size={20} /> },
  { path: '/patient/qr', label: 'My QR Code', icon: <QrCode size={20} /> },
  { path: '#', label: 'Notifications', icon: <Bell size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

const stats = [
  { label: 'Active Meds', value: '3', icon: <Pill size={22} />, color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' },
  { label: 'Allergies', value: '2', icon: <AlertTriangle size={22} />, color: 'var(--color-moderate)', bg: 'var(--color-moderate-bg)' },
  { label: 'Last Visit', value: '3 Jan', icon: <Calendar size={22} />, color: 'var(--color-secondary-500)', bg: '#eff6ff' },
  { label: 'Hash Txns', value: '7', icon: <Hash size={22} />, color: 'var(--color-gold)', bg: 'var(--color-gold-bg)' },
]

const activeMeds = [
  { name: 'Metformin', dose: '500mg', freq: '2x daily', doctor: 'Dr. Sharma' },
  { name: 'Amlodipine', dose: '5mg', freq: '1x daily', doctor: 'Dr. Gupta' },
  { name: 'Atorvastatin', dose: '20mg', freq: '1x nightly', doctor: 'Dr. Sharma' },
]

const prescriptions = [
  { date: '12 Apr 2025', doctor: 'Dr. Sharma', drug: 'Amoxicillin 500mg', level: 'safe', hash: '0x7f3a...d4c2' },
  { date: '22 Mar 2025', doctor: 'Dr. Gupta', drug: 'Amlodipine 5mg', level: 'moderate', hash: '0x9e1b...77f8' },
  { date: '3 Jan 2025', doctor: 'Dr. Sharma', drug: 'Metformin 500mg', level: 'safe', hash: '0xa3c4...2e91' },
  { date: '15 Dec 2024', doctor: 'Dr. Patel', drug: 'Warfarin 5mg', level: 'severe', hash: '0xf1d2...8a37' },
]

const appointments = [
  { date: 'Apr 20, 2025', time: '10:30 AM', doctor: 'Dr. Sharma', type: 'Follow-up', specialty: 'Cardiology' },
  { date: 'May 5, 2025', time: '2:00 PM', doctor: 'Dr. Gupta', type: 'Check-up', specialty: 'Neurology' },
]

export default function PatientDashboard() {
  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="patient" />}>
      <div className="dashboard">
        {/* Top Bar */}
        <div className="dashboard__topbar">
          <div>
            <h1 className="dashboard__greeting">Good morning, Ravi 👋</h1>
            <p className="dashboard__date">Monday, April 14, 2025</p>
          </div>
          <div className="dashboard__topbar-actions">
            <button className="dashboard__notif-btn"><Bell size={20} /><span className="dashboard__notif-dot" /></button>
            <div className="dashboard__avatar">RK</div>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard__stats">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div><span className="stat-card__value">{s.value}</span><span className="stat-card__label">{s.label}</span></div>
            </motion.div>
          ))}
        </div>

        {/* Active Meds + QR */}
        <div className="dashboard__row">
          <motion.div className="active-meds-banner" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="active-meds-banner__header">
              <AlertTriangle size={20} color="var(--color-moderate)" />
              <h3>3 Active Medications</h3>
            </div>
            <div className="active-meds-banner__list">
              {activeMeds.map((med) => (
                <div key={med.name} className="active-med-pill">
                  <Pill size={14} />
                  <strong>{med.name}</strong>
                  <span>{med.dose} · {med.freq}</span>
                  <span className="active-med-pill__doctor">{med.doctor}</span>
                </div>
              ))}
            </div>
            <a href="/patient/records" className="active-meds-banner__link">View all records →</a>
          </motion.div>

          <motion.div className="qr-preview-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <h3>My QR Code</h3>
            <div className="qr-preview-card__qr">
              <div className="qr-placeholder">
                <QrCode size={80} color="var(--color-primary-500)" />
              </div>
            </div>
            <p className="qr-preview-card__hint">Show this to your doctor</p>
            <a href="/patient/qr" className="btn btn-outline btn-sm" style={{ width: '100%' }}>Expand QR</a>
          </motion.div>
        </div>

        {/* Recent Prescriptions */}
        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className="dashboard__section-title">Recent Prescriptions</h3>
          <div className="prescriptions-table">
            <div className="prescriptions-table__header">
              <span>Date</span><span>Doctor</span><span>Drug</span><span>Interaction</span><span>Hash</span>
            </div>
            {prescriptions.map((rx, i) => (
              <div key={i} className="prescriptions-table__row">
                <span>{rx.date}</span>
                <span>{rx.doctor}</span>
                <span className="prescriptions-table__drug">{rx.drug}</span>
                <span><span className={`badge badge-${rx.level}`}>{rx.level}</span></span>
                <span className="badge badge-gold">🔐 {rx.hash}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Appointments */}
        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ marginTop: 'var(--space-6)' }}>
          <h3 className="dashboard__section-title">Upcoming Appointments</h3>
          <div className="appointments-list">
            {appointments.map((apt, i) => (
              <div key={i} className="appointment-item">
                <div className="appointment-item__date">
                  <Calendar size={16} color="var(--color-primary-500)" />
                  <span>{apt.date}</span>
                  <Clock size={14} color="var(--color-gray-400)" />
                  <span className="appointment-item__time">{apt.time}</span>
                </div>
                <div className="appointment-item__info">
                  <strong>{apt.doctor}</strong>
                  <span className="badge badge-teal">{apt.specialty}</span>
                  <span className="appointment-item__type">{apt.type}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}
