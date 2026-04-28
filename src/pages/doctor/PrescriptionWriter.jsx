import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Camera, Edit, Users, BarChart2, Pill, AlertTriangle, CheckCircle, AlertOctagon, Search, ArrowRight } from 'lucide-react'
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
const drugs = ['Aspirin','Amoxicillin','Atorvastatin','Amlodipine','Azithromycin','Acetaminophen']

export default function PrescriptionWriter() {
  const [drugName, setDrugName] = useState('')
  const [showSug, setShowSug] = useState(false)
  const [check, setCheck] = useState(null)
  const filtered = drugs.filter(d => d.toLowerCase().includes(drugName.toLowerCase()) && drugName.length > 0)

  const selectDrug = (d) => {
    setDrugName(d); setShowSug(false); setCheck('checking')
    setTimeout(() => setCheck(d === 'Aspirin' ? 'severe' : d === 'Amoxicillin' ? 'moderate' : 'safe'), 800)
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard">
        <PatientHeader />
        <ActiveMedsStrip />
        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="dashboard__section-title">New Prescription</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <DrugInput drugName={drugName} setDrugName={setDrugName} showSug={showSug} setShowSug={setShowSug} filtered={filtered} selectDrug={selectDrug} setCheck={setCheck} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">Dosage (mg)</label><input className="form-input" type="number" placeholder="500" /></div>
              <div className="form-group"><label className="form-label">Frequency</label><select className="form-select"><option>1x daily</option><option>2x daily</option><option>3x daily</option></select></div>
              <div className="form-group"><label className="form-label">Duration (days)</label><input className="form-input" type="number" placeholder="7" /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={3} placeholder="Additional notes..." style={{ resize: 'vertical' }} /></div>
          </div>
          <InteractionResult check={check} setCheck={setCheck} setDrugName={setDrugName} />
          {!check && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <button className="btn btn-ghost btn-md">Cancel</button>
            <button className="btn btn-primary btn-md" disabled={!drugName}>Save Prescription</button>
          </div>}
        </motion.div>
      </div>
    </PageShell>
  )
}

function PatientHeader() {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-4)', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <div className="dashboard__avatar" style={{ width: 48, height: 48, fontSize: 'var(--text-base)' }}>RK</div>
      <div><h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>Ravi Kumar</h2><p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>ABHA: 14-1234-5678-9012 · B+</p></div>
    </motion.div>
  )
}

function ActiveMedsStrip() {
  return (
    <div style={{ background: '#FFF9E6', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderLeft: '4px solid var(--color-moderate)', flexWrap: 'wrap' }}>
      <AlertTriangle size={16} color="var(--color-moderate)" />
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Active:</span>
      {['Metformin 500mg', 'Warfarin 5mg', 'Amlodipine 5mg'].map(m => (
        <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: 'white', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}><Pill size={12} /> {m}</span>
      ))}
    </div>
  )
}

function DrugInput({ drugName, setDrugName, showSug, setShowSug, filtered, selectDrug, setCheck }) {
  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">Drug Name</label>
      <div style={{ position: 'relative' }}>
        <input className="form-input" placeholder="Search drug..." value={drugName} onChange={e => { setDrugName(e.target.value); setShowSug(true); setCheck(null) }} style={{ paddingRight: 40 }} />
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
      </div>
      {showSug && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 10, marginTop: 4, border: '1px solid var(--color-gray-200)' }}>
          {filtered.map(d => <div key={d} onClick={() => selectDrug(d)} style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--color-gray-100)' }}><strong>{d}</strong></div>)}
        </div>
      )}
    </div>
  )
}

function InteractionResult({ check, setCheck, setDrugName }) {
  if (!check) return null
  const reset = () => { setCheck(null); setDrugName('') }
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 'var(--space-6)' }}>
        {check === 'checking' && <div style={{ padding: 'var(--space-6)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}><div style={{ width: 24, height: 24, border: '3px solid var(--color-primary-500)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto var(--space-3)' }} /><p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>Checking interactions… ⏳</p></div>}
        {check === 'severe' && <SevereAlert onCancel={reset} />}
        {check === 'moderate' && <ModerateAlert onCancel={reset} />}
        {check === 'safe' && <SafeAlert />}
      </motion.div>
    </AnimatePresence>
  )
}

function SevereAlert({ onCancel }) {
  return (
    <motion.div initial={{ x: 0 }} animate={{ x: [0, -6, 6, -6, 6, 0] }} transition={{ duration: 0.4 }} style={{ padding: 'var(--space-6)', background: 'var(--color-severe-bg)', borderRadius: 'var(--radius-lg)', borderLeft: '6px solid var(--color-severe)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}><AlertOctagon size={24} color="var(--color-severe)" /><h4 style={{ color: 'var(--color-severe)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>SEVERE INTERACTION</h4></div>
      <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}><strong>Warfarin × Aspirin</strong> — Risk: Major bleeding</p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-3)' }}>Source: DrugBank DB01032 + OpenFDA · XGBoost: 97.3%</p>
      <div style={{ height: 8, background: '#fecaca', borderRadius: 4, overflow: 'hidden', marginBottom: 'var(--space-4)' }}><div style={{ height: '100%', width: '97.3%', background: 'var(--color-severe)', borderRadius: 4 }} /></div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}><button className="btn btn-danger btn-md" onClick={onCancel}>Cancel Prescription</button><button className="btn btn-outline btn-md" style={{ borderColor: 'var(--color-severe)', color: 'var(--color-severe)' }}>Override ▾</button></div>
    </motion.div>
  )
}

function ModerateAlert({ onCancel }) {
  return (
    <div style={{ padding: 'var(--space-6)', background: 'var(--color-moderate-bg)', borderRadius: 'var(--radius-lg)', borderLeft: '6px solid var(--color-moderate)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}><AlertTriangle size={24} color="var(--color-moderate)" /><h4 style={{ color: 'var(--color-moderate)', fontWeight: 'var(--weight-bold)' }}>MODERATE INTERACTION</h4></div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-3)' }}>Risk: Potential adverse effect. Recommendation: Monitor renal function.</p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}><button className="btn btn-ghost btn-md" onClick={onCancel}>Cancel</button><button className="btn btn-md" style={{ background: 'var(--color-moderate)', color: 'white' }}>Proceed with Caution</button></div>
    </div>
  )
}

function SafeAlert() {
  return (
    <div style={{ padding: 'var(--space-6)', background: 'var(--color-safe-bg)', borderRadius: 'var(--radius-lg)', borderLeft: '6px solid var(--color-safe)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}><CheckCircle size={24} color="var(--color-safe)" /><h4 style={{ color: 'var(--color-safe)', fontWeight: 'var(--weight-bold)' }}>SAFE — No Known Interactions</h4></div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-4)' }}>All active medications checked. DrugBank + OpenFDA: Clear</p>
      <button className="btn btn-md" style={{ background: 'var(--color-safe)', color: 'white' }}>Save Prescription <ArrowRight size={16} /></button>
    </div>
  )
}
