import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, Pill, QrCode, Bell, Settings, AlertTriangle, Hash, Calendar, Clock, FlaskConical } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import BlockchainBadge from '../../components/BlockchainBadge.jsx'
import { patientApi } from '../../lib/api.js'
import './Dashboard.css'

const sidebarItems = [
  { path: '/patient/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/patient/records', label: 'My Records', icon: <FileText size={20} /> },
  { path: '/patient/qr', label: 'My QR Code', icon: <QrCode size={20} /> },
  { path: '#', label: 'Notifications', icon: <Bell size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

export default function PatientDashboard() {
  const [summary, setSummary] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [labOrders, setLabOrders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([patientApi.summary(), patientApi.records(), patientApi.labOrders()])
      .then(([summaryData, timelineData, labOrderData]) => {
        if (!alive) return
        setSummary(summaryData)
        setTimeline(timelineData)
        setLabOrders(labOrderData)
      })
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [])

  const patient = summary?.patient || {}
  const activeMeds = patient.activeMedications || []
  const prescriptions = (summary?.recentPrescriptions || []).slice(0, 4)
  const visits = timeline.filter(event => event.type === 'VISIT').slice(0, 3)
  const stats = useMemo(() => ([
    { label: 'Active Meds', value: String(activeMeds.length), icon: <Pill size={22} />, color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' },
    { label: 'Allergies', value: String((patient.allergies || []).length), icon: <AlertTriangle size={22} />, color: 'var(--color-moderate)', bg: 'var(--color-moderate-bg)' },
    { label: 'Visits', value: String(summary?.stats?.totalVisits || 0), icon: <Calendar size={22} />, color: 'var(--color-secondary-500)', bg: '#eff6ff' },
    { label: 'Anchored Rx', value: String(prescriptions.filter(rx => rx.blockchain?.status === 'ANCHORED').length), icon: <Hash size={22} />, color: 'var(--color-gold)', bg: 'var(--color-gold-bg)' },
  ]), [activeMeds.length, patient.allergies, prescriptions, summary?.stats?.totalVisits])

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="patient" />}>
      <div className="dashboard">
        {/* Top Bar */}
        <div className="dashboard__topbar">
          <div>
            <h1 className="dashboard__greeting">Good morning, {patient.name || 'Patient'}</h1>
            <p className="dashboard__date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="dashboard__topbar-actions">
            <button className="dashboard__notif-btn"><Bell size={20} /><span className="dashboard__notif-dot" /></button>
            <div className="dashboard__avatar">{initials(patient.name || 'MV')}</div>
          </div>
        </div>

        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}

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
              <h3>{activeMeds.length} Active Medications</h3>
            </div>
            <div className="active-meds-banner__list">
              {activeMeds.length === 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>No active medications recorded.</span>}
              {activeMeds.map((med) => (
                <div key={`${med.rxnormCui || med.displayName}-${med.startedAt || ''}`} className="active-med-pill">
                  <Pill size={14} />
                  <strong>{med.displayName || med.genericName}</strong>
                  <span>{med.strength || 'Dose not set'}</span>
                  <span className="active-med-pill__doctor">{med.expectedEndAt ? `Until ${formatDate(med.expectedEndAt)}` : 'Ongoing'}</span>
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
            {prescriptions.length === 0 && <div className="prescriptions-table__row"><span>No prescriptions yet</span><span /><span /><span /><span /></div>}
            {prescriptions.map((rx) => (
              <div key={rx._id} className="prescriptions-table__row">
                <span>{formatDate(rx.createdAt || rx.issuedAt)}</span>
                <span>{rx.doctorId?.fullName || 'MedVault doctor'}</span>
                <span className="prescriptions-table__drug">{(rx.medications || []).map(m => `${m.brandName || m.genericName} ${m.strength || ''}`).join(', ')}</span>
                <span><span className={`badge badge-${rx.medications?.some(m => m.safetyChecks?.allergyConflict) ? 'severe' : 'safe'}`}>{rx.medications?.some(m => m.safetyChecks?.allergyConflict) ? 'alert' : 'clear'}</span></span>
                <span><BlockchainBadge record={rx} /></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Visits */}
        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ marginTop: 'var(--space-6)' }}>
          <h3 className="dashboard__section-title">Recent Visits</h3>
          <div className="visit-list">
            {visits.length === 0 && <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>No recent visits found.</p>}
            {visits.map((event) => {
              const apt = event.data
              return (
              <div key={apt._id} className="visit-item">
                <div className="visit-item__date">
                  <Calendar size={16} color="var(--color-primary-500)" />
                  <span>{formatDate(apt.startedAt)}</span>
                  <Clock size={14} color="var(--color-gray-400)" />
                  <span className="visit-item__time">{formatTime(apt.startedAt)}</span>
                </div>
                <div className="visit-item__info">
                  <strong>{apt.doctorId?.fullName || 'Doctor'}</strong>
                  <span className="badge badge-teal">{apt.status}</span>
                  <span className="visit-item__type">{apt.type}</span>
                </div>
              </div>
            )})}
          </div>
        </motion.div>

        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ marginTop: 'var(--space-6)' }}>
          <h3 className="dashboard__section-title"><FlaskConical size={18} /> Lab Orders</h3>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {labOrders.length === 0 && <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>No lab orders yet.</p>}
            {labOrders.slice(0, 4).map((order) => (
              <div key={order._id} className="visit-item">
                <div><strong>{order.labId?.displayName || 'Lab order'}</strong><span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{(order.tests || []).map((test) => test.displayName).join(', ')}</span></div>
                <span className="badge badge-teal">{order.status}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
