import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, QrCode, Bell, Settings, CheckCircle, Shield, Pill, FlaskConical, Calendar, ExternalLink } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import BlockchainBadge from '../../components/BlockchainBadge.jsx'
import './Dashboard.css'

const sidebarItems = [
  { path: '/patient/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/patient/records', label: 'My Records', icon: <FileText size={20} /> },
  { path: '/patient/qr', label: 'My QR Code', icon: <QrCode size={20} /> },
  { path: '#', label: 'Notifications', icon: <Bell size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

const filters = ['All', 'Prescriptions', 'Lab Reports', 'Visits']

const records = [
  { month: 'APR 2025', items: [
    { type: 'prescription', date: '12 Apr 2025', title: 'Amoxicillin 500mg', doctor: 'Dr. Sharma', clinic: 'City Clinic', hash: '0x7f3a...d4c2', level: 'safe' },
    { type: 'lab', date: '8 Apr 2025', title: 'HbA1c', result: '6.8%', range: '<5.7%', verified: true, blockchain: { status: 'ANCHORED', contentHash: '0x7f3a8b10d4c2' } },
  ]},
  { month: 'MAR 2025', items: [
    { type: 'prescription', date: '22 Mar 2025', title: 'Metformin 500mg (renewed)', doctor: 'Dr. Gupta', clinic: 'Apollo Clinic', hash: '0x9e1b...77f8', level: 'safe' },
    { type: 'visit', date: '15 Mar 2025', title: 'Routine Check-up', doctor: 'Dr. Sharma', clinic: 'City Clinic' },
  ]},
  { month: 'JAN 2025', items: [
    { type: 'prescription', date: '3 Jan 2025', title: 'Amlodipine 5mg', doctor: 'Dr. Sharma', clinic: 'City Clinic', hash: '0xa3c4...2e91', level: 'moderate' },
  ]},
]

const typeConfig = { prescription: { color: 'var(--color-primary-500)', icon: <Pill size={16} /> }, lab: { color: 'var(--color-secondary-500)', icon: <FlaskConical size={16} /> }, visit: { color: 'var(--color-gray-400)', icon: <Calendar size={16} /> } }

export default function MedicalRecord() {
  const [activeFilter, setActiveFilter] = useState('All')

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="patient" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div><h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>Medical Records</h1><p className="dashboard__date">Timeline of your health journey</p></div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button key={f} className={`btn btn-sm ${activeFilter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveFilter(f)}>{f}</button>
          ))}
        </div>

        {/* Timeline */}
        <div className="timeline">
          {records.map((group, gi) => (
            <div key={group.month} className="timeline__group">
              <div className="timeline__month">{group.month}</div>
              {group.items.map((item, ii) => {
                if (activeFilter !== 'All' && activeFilter.toLowerCase() !== item.type + 's' && !(activeFilter === 'Prescriptions' && item.type === 'prescription') && !(activeFilter === 'Lab Reports' && item.type === 'lab') && !(activeFilter === 'Visits' && item.type === 'visit')) return null
                const cfg = typeConfig[item.type]
                return (
                  <motion.div key={ii} className="timeline__item" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: ii * 0.1 }}>
                    <div className="timeline__dot" style={{ background: cfg.color }}>{cfg.icon}</div>
                    <div className="timeline__card card">
                      <div className="timeline__card-header">
                        <h4>{item.title}</h4>
                        {item.level && <span className={`badge badge-${item.level}`}>{item.level}</span>}
                      </div>
                      <p className="timeline__card-meta">
                        {item.doctor && <>{item.doctor} · {item.clinic} · </>}{item.date}
                      </p>
                      {item.result && (
                        <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                          Result: <strong>{item.result}</strong> <span style={{ color: 'var(--color-gray-400)' }}>(Normal: {item.range})</span>
                          {item.verified && <span className="badge badge-safe" style={{ marginLeft: 'var(--space-2)' }}>Verified ✓</span>}
                        </p>
                      )}
                      {item.hash && (
                        <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge badge-gold">🔐 {item.hash}</span>
                          <a href="#" style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>View on chain <ExternalLink size={12} /></a>
                        </div>
                      )}
                      {item.type === 'lab' && item.blockchain && (
                        <div style={{ marginTop: 'var(--space-3)' }}>
                          <BlockchainBadge record={item} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .timeline { position: relative; padding-left: var(--space-10); }
        .timeline::before { content: ''; position: absolute; left: 19px; top: 0; bottom: 0; width: 2px; background: var(--color-primary-200); }
        .timeline__group { margin-bottom: var(--space-8); }
        .timeline__month { font-size: var(--text-sm); font-weight: var(--weight-bold); color: var(--color-gray-400); margin-bottom: var(--space-4); text-transform: uppercase; letter-spacing: 0.05em; }
        .timeline__item { display: flex; gap: var(--space-4); margin-bottom: var(--space-4); position: relative; }
        .timeline__dot { position: absolute; left: calc(-1 * var(--space-10) + 8px); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; z-index: 1; font-size: 12px; }
        .timeline__card { flex: 1; cursor: pointer; }
        .timeline__card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
        .timeline__card-header h4 { font-size: var(--text-base); font-weight: var(--weight-bold); color: var(--color-gray-900); }
        .timeline__card-meta { font-size: var(--text-sm); color: var(--color-gray-400); }
      `}</style>
    </PageShell>
  )
}
