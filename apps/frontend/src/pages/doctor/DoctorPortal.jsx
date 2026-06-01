import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Home, Camera, Edit, Users, BarChart2, Bell, FileText, AlertTriangle, CheckCircle, QrCode, ArrowRight } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import QuickRegisterPatient from '../../components/doctor/QuickRegisterPatient.jsx'
import { doctorApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '#', label: 'Patient List', icon: <Users size={20} /> },
  { path: '#', label: 'My Activity', icon: <BarChart2 size={20} /> },
]

export default function DoctorPortal() {
  const [doctor, setDoctor] = useState(null)
  const [queue, setQueue] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([doctorApi.profile(), doctorApi.todayQueue()])
      .then(([profile, todayQueue]) => {
        if (!alive) return
        setDoctor(profile)
        setQueue(todayQueue)
      })
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [])

  const todayStats = useMemo(() => ([
    { label: 'Patients Queued', value: String(queue.length), color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' },
    { label: 'Completed', value: String(queue.filter(item => item.status === 'COMPLETED').length), color: 'var(--color-secondary-500)', bg: '#eff6ff' },
    { label: 'In Consult', value: String(queue.filter(item => item.status === 'IN_CONSULTATION').length), color: 'var(--color-severe)', bg: 'var(--color-severe-bg)' },
    { label: 'Checked In', value: String(queue.filter(item => item.status === 'CHECKED_IN').length), color: 'var(--color-safe)', bg: 'var(--color-safe-bg)' },
  ]), [queue])

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div>
            <h1 className="dashboard__greeting">{doctor?.fullName || 'Doctor Dashboard'}</h1>
            <p className="dashboard__date">{doctor?.specializations?.[0]?.displayName || 'Care team'} · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="dashboard__topbar-actions">
            <button className="dashboard__notif-btn"><Bell size={20} /><span className="dashboard__notif-dot" /></button>
            <div className="dashboard__avatar" style={{ background: 'var(--color-primary-800)' }}>{initials(doctor?.fullName || 'DR')}</div>
          </div>
        </div>
        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}

        {/* Stats */}
        <div className="dashboard__stats">
          {todayStats.map((s, i) => (
            <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>
                {i === 0 ? <Users size={22} /> : i === 1 ? <FileText size={22} /> : i === 2 ? <AlertTriangle size={22} /> : <CheckCircle size={22} />}
              </div>
              <div><span className="stat-card__value">{s.value}</span><span className="stat-card__label">{s.label}</span></div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="dashboard__row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Link to="/doctor/scan" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-primary-50), white)', border: '2px solid var(--color-primary-200)', cursor: 'pointer', textAlign: 'center', padding: 'var(--space-10)' }}>
                <QrCode size={48} color="var(--color-primary-500)" style={{ marginBottom: 'var(--space-4)' }} />
                <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Scan Patient QR</h3>
                <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>Scan a patient's QR code to load their medical history and begin consultation</p>
                <span className="btn btn-primary btn-md">Open Scanner <ArrowRight size={16} /></span>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Link to="/doctor/prescribe" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ background: 'linear-gradient(135deg, #eff6ff, white)', border: '2px solid #bfdbfe', cursor: 'pointer', textAlign: 'center', padding: 'var(--space-10)' }}>
                <Edit size={48} color="var(--color-secondary-500)" style={{ marginBottom: 'var(--space-4)' }} />
                <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Write Prescription</h3>
                <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>Create a new prescription with AI-powered drug interaction checking</p>
                <span className="btn btn-md" style={{ background: 'var(--color-secondary-500)', color: 'white' }}>New Prescription <ArrowRight size={16} /></span>
              </div>
            </Link>
          </motion.div>
        </div>

        <QuickRegisterPatient onComplete={() => doctorApi.todayQueue().then(setQueue).catch(() => {})} />

        {/* Recent Patients */}
        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className="dashboard__section-title">Today's Patients</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {queue.length === 0 && <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>No patients in today&apos;s queue.</p>}
            {queue.map((visit) => {
              const patient = visit.patientId || {}
              return (
              <div key={visit._id} className="visit-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div className="dashboard__avatar" style={{ width: 36, height: 36, fontSize: 'var(--text-xs)' }}>{initials(patient.fullName || 'PT')}</div>
                  <div>
                    <strong style={{ fontSize: 'var(--text-sm)' }}>{patient.fullName || 'Patient'}</strong>
                    <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)' }}>{patient.medvaultId || visit._id}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Link className="btn btn-ghost btn-sm" to={`/doctor/patient/${patient._id || visit.patientId}`}>Open</Link>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>{formatTime(visit.startedAt)}</span>
                  <span className={`badge ${visit.status === 'COMPLETED' ? 'badge-safe' : 'badge-teal'}`}>{visit.status}</span>
                </div>
              </div>
            )})}
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
