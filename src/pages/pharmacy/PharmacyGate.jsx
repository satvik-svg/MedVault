import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Camera, CheckCircle, QrCode, Package, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../patient/Dashboard.css'

export default function PharmacyGate() {
  const [scanned, setScanned] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', padding: 'var(--space-8)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none', color: 'var(--color-gray-900)' }}>
            <div className="navbar__logo-icon" style={{ width: 36, height: 36 }}><Shield size={20} /></div>
            <span className="navbar__logo-text" style={{ fontSize: 'var(--text-lg)' }}>MedVault</span>
          </Link>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)', borderLeft: '1px solid var(--color-gray-200)', paddingLeft: 'var(--space-3)' }}>Pharmacy Gate</span>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-8)' }}>Second Safety Check — Interaction Re-verified Before Dispensing</p>

        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {!scanned ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
              <div style={{ width: 200, height: 200, margin: '0 auto var(--space-6)', background: 'var(--color-gray-900)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 20, border: 'none' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 16, borderTop: '3px solid var(--color-primary-400)', borderLeft: '3px solid var(--color-primary-400)' }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderTop: '3px solid var(--color-primary-400)', borderRight: '3px solid var(--color-primary-400)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: 16, height: 16, borderBottom: '3px solid var(--color-primary-400)', borderLeft: '3px solid var(--color-primary-400)' }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderBottom: '3px solid var(--color-primary-400)', borderRight: '3px solid var(--color-primary-400)' }} />
                </div>
                <Camera size={40} color="var(--color-gray-600)" />
              </div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Scan Prescription QR</h3>
              <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>Scan the patient's prescription QR code to verify and dispense</p>
              <button className="btn btn-primary btn-lg" onClick={() => setScanned(true)}><Camera size={18} /> Simulate Scan</button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div className="dashboard__avatar" style={{ width: 48, height: 48, fontSize: 'var(--text-base)' }}>RK</div>
                <div>
                  <strong style={{ fontSize: 'var(--text-lg)' }}>Ravi Kumar</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
                    <span className="badge badge-safe">ABHA Verified ✓</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                  <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Drug</span><strong>Metformin 500mg</strong></div>
                  <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Prescribed By</span><strong>Dr. Sharma</strong></div>
                  <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Date</span><strong>12 Apr 2025</strong></div>
                  <div><span style={{ color: 'var(--color-gray-400)', display: 'block' }}>Blockchain Hash</span><span className="badge badge-gold">🔐 0x7f3a...d4c2 ✓</span></div>
                </div>
              </div>

              <div style={{ padding: 'var(--space-5)', background: 'var(--color-safe-bg)', borderRadius: 'var(--radius-lg)', borderLeft: '6px solid var(--color-safe)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle size={24} color="var(--color-safe)" />
                  <h4 style={{ color: 'var(--color-safe)', fontWeight: 'var(--weight-bold)' }}>SAFE TO DISPENSE</h4>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginTop: 'var(--space-2)' }}>Interaction re-check passed. No conflicts with active medications.</p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-md" style={{ background: 'var(--color-safe)', color: 'white', flex: 1 }}><Package size={16} /> Dispense Approved ✓</button>
                <button className="btn btn-outline btn-md" style={{ borderColor: 'var(--color-severe)', color: 'var(--color-severe)' }}><AlertTriangle size={16} /> Flag Issue</button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
