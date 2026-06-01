import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, QrCode, Bell, Settings, Download, Share2, AlertTriangle } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import { patientApi, qrApi } from '../../lib/api.js'
import './Dashboard.css'

const sidebarItems = [
  { path: '/patient/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/patient/records', label: 'My Records', icon: <FileText size={20} /> },
  { path: '/patient/qr', label: 'My QR Code', icon: <QrCode size={20} /> },
  { path: '#', label: 'Notifications', icon: <Bell size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

export default function QRPage() {
  const [mode, setMode] = useState('emergency')
  const [patient, setPatient] = useState(null)
  const [emergencyQr, setEmergencyQr] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([patientApi.profile(), patientApi.emergencyQR()])
      .then(([profile, qr]) => {
        if (!alive) return
        setPatient(profile)
        setEmergencyQr(qr)
      })
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [])

  const regenerate = async () => {
    try {
      const qr = await qrApi.generateEmergency()
      setEmergencyQr(qr)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="patient" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div><h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>My QR Code</h1><p className="dashboard__date">Emergency QR shares only critical lifesaving data</p></div>
        </div>
        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <motion.div className="card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ flex: '0 0 360px', textAlign: 'center' }}>
            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
              <button className={`btn btn-sm ${mode === 'standard' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setMode('standard')}>Standard</button>
              <button className={`btn btn-sm ${mode === 'emergency' ? 'btn-danger' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setMode('emergency')}>Emergency</button>
            </div>

            <div style={{ padding: 'var(--space-6)', background: mode === 'emergency' ? 'var(--color-severe-bg)' : 'var(--color-primary-50)', borderRadius: 'var(--radius-xl)', border: mode === 'emergency' ? '3px solid var(--color-severe)' : '3px solid var(--color-primary-300)', marginBottom: 'var(--space-4)' }}>
              {mode === 'emergency' && emergencyQr?.qrImageUrl
                ? <img src={emergencyQr.qrImageUrl} alt="Emergency QR" style={{ width: 220, height: 220, margin: '0 auto', display: 'block' }} />
                : <QrCode size={200} color={mode === 'emergency' ? 'var(--color-severe)' : 'var(--color-primary-600)'} style={{ margin: '0 auto' }} />}
              {mode === 'emergency' && <div className="badge badge-severe" style={{ marginTop: 'var(--space-3)' }}><AlertTriangle size={12} /> EMERGENCY</div>}
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-4)' }}>
              {mode === 'standard' ? 'Full medical record access for authorized doctors' : 'Emergency subset: Blood type, allergies, active medications'}
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-outline btn-md" style={{ flex: 1 }}><Download size={16} /> Download</button>
              <button className="btn btn-primary btn-md" style={{ flex: 1 }} onClick={regenerate}><Share2 size={16} /> Regenerate</button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ flex: 1, minWidth: 280 }}>
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="dashboard__section-title">Patient Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Full Name</span><strong>{patient?.fullName || 'Not completed'}</strong></div>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>MedVault ID</span><strong style={{ fontFamily: 'var(--font-mono)' }}>{patient?.medvaultId || 'Not issued'}</strong></div>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Blood Type</span><strong>{patient?.bloodGroup || 'Unknown'}</strong></div>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>QR Expires</span><strong>{emergencyQr?.expiresAt ? new Date(emergencyQr.expiresAt).toLocaleDateString() : 'Not generated'}</strong></div>
              </div>
            </div>
            <div className="card">
              <h3 className="dashboard__section-title">QR Data Includes</h3>
              <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {(mode === 'standard' ? ['ABHA ID + JWT token', 'Full medical history', 'Active medications list', 'Known allergies', 'Recent prescriptions', 'Lab reports'] : ['Blood type', 'Known allergies', 'Active medications', 'Emergency contacts']).map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: mode === 'emergency' ? 'var(--color-severe)' : 'var(--color-primary-500)', flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </PageShell>
  )
}
