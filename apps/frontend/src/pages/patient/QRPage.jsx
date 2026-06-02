import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, QrCode, Bell, Settings, Download, Share2 } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import { patientApi } from '../../lib/api.js'
import './Dashboard.css'

const sidebarItems = [
  { path: '/patient/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/patient/records', label: 'My Records', icon: <FileText size={20} /> },
  { path: '/patient/qr', label: 'My QR Code', icon: <QrCode size={20} /> },
  { path: '#', label: 'Notifications', icon: <Bell size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

export default function QRPage() {
  const [patient, setPatient] = useState(null)
  const [qr, setQr] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([patientApi.profile(), patientApi.qr()])
      .then(([profile, qrData]) => {
        if (!alive) return
        setPatient(profile)
        setQr(qrData)
      })
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [])

  const qrPayload = qr?.patient?.medvaultId || patient?.medvaultId || patient?._id || 'MEDVAULT'
  const handleDownload = () => {
    if (!qr?.qrDataUrl) return
    const link = document.createElement('a')
    link.href = qr.qrDataUrl
    link.download = `${qrPayload}-medvault-qr.svg`
    link.click()
  }
  const handleShare = async () => {
    if (!qr?.uri) return
    if (navigator.share) {
      await navigator.share({ title: 'MedVault patient QR', text: 'Scan this MedVault QR to request access.', url: qr.uri })
    } else {
      await navigator.clipboard.writeText(qr.uri)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="patient" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>My QR Code</h1>
            <p className="dashboard__date">Show this to your doctor to request consented record access</p>
          </div>
        </div>
        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <motion.div className="card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ flex: '0 0 360px', textAlign: 'center' }}>
            <div style={{ padding: 'var(--space-6)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-xl)', border: '3px solid var(--color-primary-300)', marginBottom: 'var(--space-4)' }}>
              {qr?.qrDataUrl ? (
                <img src={qr.qrDataUrl} alt="Signed MedVault patient QR" style={{ width: 240, maxWidth: '100%', aspectRatio: '1 / 1', display: 'block', margin: '0 auto', borderRadius: 'var(--radius-lg)' }} />
              ) : (
                <QrCode size={200} color="var(--color-primary-600)" style={{ margin: '0 auto' }} />
              )}
              <div className="badge badge-teal" style={{ marginTop: 'var(--space-3)' }}>{qrPayload}</div>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-4)' }}>
              Doctors scan this signed QR, then MedVault asks you for consent before sharing records.
              {qr?.expiresAt ? ` It expires at ${new Date(qr.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : ''}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-outline btn-md" style={{ flex: 1 }} onClick={handleDownload} disabled={!qr?.qrDataUrl}><Download size={16} /> Download</button>
              <button className="btn btn-primary btn-md" style={{ flex: 1 }} onClick={handleShare} disabled={!qr?.uri}><Share2 size={16} /> Share</button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ flex: 1, minWidth: 280 }}>
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="dashboard__section-title">Patient Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Full Name</span><strong>{patient?.fullName || 'Not completed'}</strong></div>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>MedVault ID</span><strong style={{ fontFamily: 'var(--font-mono)' }}>{patient?.medvaultId || 'Not issued'}</strong></div>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Blood Type</span><strong>{patient?.bloodGroup || 'Unknown'}</strong></div>
                <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Consent</span><strong>Always required</strong></div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageShell>
  )
}
