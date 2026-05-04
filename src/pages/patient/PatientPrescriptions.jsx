import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, QrCode, Bell, Settings, Pill, AlertTriangle, CheckCircle, XCircle, Calendar, Hash, ExternalLink } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/patient/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/patient/records', label: 'My Records', icon: <FileText size={20} /> },
  { path: '/patient/qr', label: 'My QR Code', icon: <QrCode size={20} /> },
  { path: '#', label: 'Notifications', icon: <Bell size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

const activeMeds = [
  { name: 'Metformin', generic: 'Metformin HCl', dose: '500mg', freq: '2x daily', prescribedBy: 'Dr. Sharma', since: '12 Jan 2025', status: 'active' },
  { name: 'Amlodipine', generic: 'Amlodipine Besylate', dose: '5mg', freq: '1x daily', prescribedBy: 'Dr. Sharma', since: '3 Jan 2025', status: 'active' },
  { name: 'Atorvastatin', generic: 'Atorvastatin Calcium', dose: '20mg', freq: '1x nightly', prescribedBy: 'Dr. Gupta', since: '20 Feb 2025', status: 'active' },
]

const prescriptionHistory = [
  { date: '12 Apr 2025', drug: 'Amoxicillin 500mg', dose: '500mg', freq: '3x daily', duration: '7 days', prescribedBy: 'Dr. Sharma', diagnosis: 'Bacterial infection', level: 'safe', hash: '0x7f3a...d4c2' },
  { date: '22 Mar 2025', drug: 'Metformin 500mg', dose: '500mg', freq: '2x daily', duration: '90 days', prescribedBy: 'Dr. Gupta', diagnosis: 'Type 2 Diabetes', level: 'moderate', hash: '0x9e1b...77f8' },
  { date: '3 Jan 2025', drug: 'Amlodipine 5mg', dose: '5mg', freq: '1x daily', duration: '30 days', prescribedBy: 'Dr. Sharma', diagnosis: 'Hypertension', level: 'safe', hash: '0xa3c4...2e91' },
  { date: '15 Dec 2024', drug: 'Cetirizine 10mg', dose: '10mg', freq: '1x nightly', duration: '14 days', prescribedBy: 'Dr. Patel', diagnosis: 'Allergic rhinitis', level: 'safe', hash: '0xb8d1...5c72' },
]

const levelConfig = {
  severe: { color: 'var(--color-severe)', bg: 'var(--color-severe-bg)', icon: <XCircle size={14} /> },
  moderate: { color: 'var(--color-moderate)', bg: 'var(--color-moderate-bg)', icon: <AlertTriangle size={14} /> },
  safe: { color: 'var(--color-safe)', bg: 'var(--color-safe-bg)', icon: <CheckCircle size={14} /> },
}

export default function PatientPrescriptions() {
  const [showInteractionWarning, setShowInteractionWarning] = useState(false)

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="patient" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>My Prescriptions</h1>
            <p className="dashboard__date">Active medications and prescription history</p>
          </div>
        </div>

        {/* Drug Interaction Warning Banner */}
        {showInteractionWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--color-severe-bg)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-6)', borderLeft: '6px solid var(--color-severe)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}
          >
            <AlertTriangle size={24} color="var(--color-severe)" />
            <div style={{ flex: 1 }}>
              <strong style={{ color: 'var(--color-severe)' }}>Interaction Detected</strong>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginTop: 2 }}>
                Amoxicillin may interact with your active Warfarin prescription. Consult your doctor.
              </p>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => setShowInteractionWarning(false)}>
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Active Medications Table */}
        <motion.div
          className="card card--no-hover"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
            <h3 className="dashboard__section-title" style={{ marginBottom: 0 }}>Active Medications</h3>
            <span className="badge badge-safe">{activeMeds.length} active</span>
          </div>

          <div className="prescriptions-table">
            <div className="prescriptions-table__header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr 80px' }}>
              <span>Drug Name</span>
              <span>Dosage</span>
              <span>Frequency</span>
              <span>Prescribed By</span>
              <span>Since</span>
              <span>Status</span>
              <span>Hash</span>
            </div>
            {activeMeds.map((med, i) => (
              <div key={i} className="prescriptions-table__row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr 80px' }}>
                <span>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>{med.name}</strong>
                  <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{med.generic}</span>
                </span>
                <span style={{ fontSize: 'var(--text-sm)' }}>{med.dose}</span>
                <span style={{ fontSize: 'var(--text-sm)' }}>{med.freq}</span>
                <span style={{ fontSize: 'var(--text-sm)' }}>{med.prescribedBy}</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>{med.since}</span>
                <span><span className="badge badge-safe">Active</span></span>
                <span><span className="badge badge-gold">🔐 {med.hash?.slice(0, 6)}</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Medication Timeline */}
        <motion.div
          className="card card--no-hover"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ marginTop: 'var(--space-6)' }}
        >
          <h3 className="dashboard__section-title" style={{ marginBottom: 'var(--space-5)' }}>Medication Timeline</h3>
          <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-3)' }}>
            {[
              { month: 'Dec', items: [{ drug: 'Cetirizine', color: '#94a3b8' }] },
              { month: 'Jan', items: [{ drug: 'Amlodipine', color: 'var(--color-primary-500)' }, { drug: 'Metformin', color: 'var(--color-primary-500)' }] },
              { month: 'Feb', items: [{ drug: 'Atorvastatin', color: 'var(--color-primary-500)' }] },
              { month: 'Mar', items: [{ drug: 'Metformin ↑', color: 'var(--color-safe)' }] },
              { month: 'Apr', items: [{ drug: 'Amoxicillin', color: 'var(--color-secondary-500)' }] },
            ].map((month, i) => (
              <div key={month.month} style={{ minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-2)' }}>{month.month}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'center' }}>
                  {month.items.map((item, j) => (
                    <div key={j} style={{ width: 40, height: 8, background: item.color, borderRadius: 4 }} title={item.drug} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
            {[
              { color: 'var(--color-primary-500)', label: 'Started' },
              { color: 'var(--color-safe)', label: 'Dose Adjusted' },
              { color: 'var(--color-secondary-500)', label: 'Short-term' },
              { color: '#94a3b8', label: 'Discontinued' },
            ].map(legend => (
              <div key={legend.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                <div style={{ width: 16, height: 4, background: legend.color, borderRadius: 2 }} />
                {legend.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Prescription History */}
        <motion.div
          className="card card--no-hover"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: 'var(--space-6)' }}
        >
          <h3 className="dashboard__section-title">Prescription History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {prescriptionHistory.map((rx, i) => {
              const cfg = levelConfig[rx.level] || levelConfig.safe
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', borderLeft: `4px solid ${cfg.color}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong style={{ fontSize: 'var(--text-base)' }}>{rx.drug}</strong>
                      <span className={`badge`} style={{ background: cfg.bg, color: cfg.color }}>{rx.level}</span>
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 4 }}>
                      {rx.dose} · {rx.freq} · {rx.duration} · {rx.diagnosis}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                      <span><Calendar size={12} style={{ marginRight: 4 }} />{rx.date}</span>
                      <span>{rx.prescribedBy}</span>
                      <span className="badge badge-gold">🔐 {rx.hash}</span>
                      <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--color-primary-500)' }}>View on chain <ExternalLink size={10} /></a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}