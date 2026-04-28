import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Camera, Edit, Users, BarChart2, QrCode, CheckCircle, Shield, User, ArrowRight } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '#', label: 'Patient List', icon: <Users size={20} /> },
  { path: '#', label: 'My Activity', icon: <BarChart2 size={20} /> },
]

export default function QRScanner() {
  const [scanned, setScanned] = useState(false)

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div><h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>Scan Patient QR</h1></div>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Scanner Area */}
          <motion.div className="card card--no-hover" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ position: 'relative', width: 280, height: 280, margin: '0 auto var(--space-6)', background: scanned ? 'var(--color-safe-bg)' : 'var(--color-gray-900)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!scanned ? (
                <>
                  {/* Scanning Reticle */}
                  <div style={{ position: 'absolute', inset: 30, border: 'none' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '3px solid var(--color-primary-400)', borderLeft: '3px solid var(--color-primary-400)' }} />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '3px solid var(--color-primary-400)', borderRight: '3px solid var(--color-primary-400)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '3px solid var(--color-primary-400)', borderLeft: '3px solid var(--color-primary-400)' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '3px solid var(--color-primary-400)', borderRight: '3px solid var(--color-primary-400)' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'var(--color-primary-500)', animation: 'scanLine 2s ease-in-out infinite', top: '50%' }} />
                  </div>
                  <Camera size={48} color="var(--color-gray-600)" />
                </>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  <CheckCircle size={64} color="var(--color-safe)" />
                </motion.div>
              )}
            </div>

            {!scanned ? (
              <button className="btn btn-primary btn-lg" onClick={() => setScanned(true)}>
                <Camera size={18} /> Simulate Scan
              </button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', justifyContent: 'center' }}>
                  <span className="badge badge-safe" style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>✅ Verified via ABDM API + JWT</span>
                </div>
                <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div className="dashboard__avatar" style={{ width: 48, height: 48 }}>RK</div>
                    <div><strong>Ravi Kumar</strong><br /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)' }}>ABHA: 14-1234-5678-9012</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                    <div><span style={{ color: 'var(--color-gray-400)' }}>Age:</span> 34</div>
                    <div><span style={{ color: 'var(--color-gray-400)' }}>Blood:</span> B+</div>
                    <div><span style={{ color: 'var(--color-gray-400)' }}>Allergies:</span> <span className="badge badge-severe">Penicillin</span></div>
                    <div><span style={{ color: 'var(--color-gray-400)' }}>Active Meds:</span> 3</div>
                  </div>
                  <Link to="/doctor/prescribe/1" className="btn btn-primary btn-md" style={{ width: '100%' }}>
                    View Full Record & Prescribe <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>
            )}

            <div style={{ marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>
              OR
              <div style={{ marginTop: 'var(--space-3)' }}>
                <input className="form-input" placeholder="Enter ABHA ID manually" style={{ maxWidth: 300 }} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageShell>
  )
}
