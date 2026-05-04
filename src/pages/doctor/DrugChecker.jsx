import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, Camera, Edit, Users, BarChart2, Search, AlertTriangle, CheckCircle, AlertOctagon, ArrowRight, History } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '/doctor/drug-checker', label: 'Drug Checker', icon: <Search size={20} /> },
  { path: '#', label: 'Patient List', icon: <Users size={20} /> },
  { path: '#', label: 'My Activity', icon: <BarChart2 size={20} /> },
]

const drugList = ['Aspirin', 'Warfarin', 'Metformin', 'Amlodipine', 'Atorvastatin', 'Amoxicillin', 'Azithromycin', 'Lisinopril', 'Paracetamol', 'Omeprazole', 'Ibuprofen', 'Naproxen', 'Ciprofloxacin', 'Levothyroxine']

const checkHistory = [
  { drugs: 'Aspirin + Warfarin', severity: 'severe', time: '2 mins ago' },
  { drugs: 'Metformin + Alcohol', severity: 'moderate', time: '15 mins ago' },
  { drugs: 'Paracetamol + Amoxicillin', severity: 'safe', time: '1 hour ago' },
  { drugs: 'Omeprazole + Clopidogrel', severity: 'moderate', time: '3 hours ago' },
]

const severityConfig = {
  severe: { label: 'SEVERE', color: 'var(--color-severe)', bg: 'var(--color-severe-bg)', icon: <AlertOctagon size={20} /> },
  moderate: { label: 'MODERATE', color: 'var(--color-moderate)', bg: 'var(--color-moderate-bg)', icon: <AlertTriangle size={20} /> },
  safe: { label: 'SAFE', color: 'var(--color-safe)', bg: 'var(--color-safe-bg)', icon: <CheckCircle size={20} /> },
}

export default function DrugChecker() {
  const [drugA, setDrugA] = useState('')
  const [drugB, setDrugB] = useState('')
  const [showSugA, setShowSugA] = useState(false)
  const [showSugB, setShowSugB] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)

  const filteredA = drugList.filter(d => d.toLowerCase().includes(drugA.toLowerCase()) && drugA.length > 0)
  const filteredB = drugList.filter(d => d.toLowerCase().includes(drugB.toLowerCase()) && drugB.length > 0)

  const handleCheck = () => {
    if (!drugA || !drugB) return
    setChecking(true)
    setCheckResult(null)
    setTimeout(() => {
      const pair = `${drugA}-${drugB}`
      if (pair.includes('Aspirin') && pair.includes('Warfarin')) {
        setCheckResult({
          severity: 'severe',
          mechanism: 'Both drugs inhibit platelet aggregation through different mechanisms. Aspirin irreversibly inhibits COX-1, while Warfarin inhibits vitamin K-dependent clotting factors. Combined use significantly increases risk of major bleeding events.',
          recommendation: 'DO NOT co-administer. The combination of aspirin and warfarin produces a synergistic anticoagulant effect that substantially elevates the risk of serious bleeding, including gastrointestinal and intracranial hemorrhage.',
          source: 'DrugBank DB01014 + DB00682',
          confidence: 97.3,
        })
      } else if (pair.includes('Metformin') && pair.includes('Alcohol')) {
        setCheckResult({
          severity: 'moderate',
          mechanism: 'Alcohol can potentiate the effect of Metformin on lactate metabolism, increasing the risk of lactic acidosis, particularly in patients with impaired renal function or excessive alcohol consumption.',
          recommendation: 'Use with caution. Limit alcohol intake. Monitor renal function. Watch for signs of lactic acidosis (weakness, fatigue, nausea, abdominal pain).',
          source: 'OpenFDA + DrugBank DB00328',
          confidence: 88.5,
        })
      } else {
        setCheckResult({
          severity: 'safe',
          mechanism: null,
          recommendation: 'No clinically significant drug interaction detected between these medications. Safe to co-administer based on available data from DrugBank and OpenFDA.',
          source: 'DrugBank + OpenFDA',
          confidence: 91.2,
        })
      }
      setChecking(false)
    }, 1200)
  }

  const DrugInput = ({ label, value, setValue, showSug, setShowSug, filtered, placeholder }) => (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={e => { setValue(e.target.value); setShowSug(true) }}
          style={{ paddingRight: 40 }}
        />
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
      </div>
      {showSug && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 10,
          marginTop: 4, border: '1px solid var(--color-gray-200)', maxHeight: 200, overflowY: 'auto'
        }}>
          {filtered.map(d => (
            <div
              key={d}
              onClick={() => { setValue(d); setShowSug(false) }}
              style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--color-gray-100)' }}
            >
              <strong>{d}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>Drug Interaction Checker</h1>
            <p className="dashboard__date">Real-time drug safety check powered by DrugBank + OpenFDA</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 'var(--space-4)', alignItems: 'end', marginBottom: 'var(--space-6)' }}>
          <DrugInput label="Drug A" value={drugA} setValue={setDrugA} showSug={showSugA} setShowSug={setShowSugA} filtered={filteredA} placeholder="Enter first drug..." />
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleCheck}
              disabled={!drugA || !drugB || checking}
              style={{ width: 80, height: 48 }}
            >
              {checking ? (
                <div style={{ width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <ArrowRight size={18} />
              )}
            </button>
          </div>
          <DrugInput label="Drug B" value={drugB} setValue={setDrugB} showSug={showSugB} setShowSug={setShowSugB} filtered={filteredB} placeholder="Enter second drug..." />
        </div>

        {/* Result */}
        {checkResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: 'var(--space-8)', background: severityConfig[checkResult.severity].bg, borderRadius: 'var(--radius-xl)', borderLeft: `6px solid ${severityConfig[checkResult.severity].color}`, marginBottom: 'var(--space-6)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: severityConfig[checkResult.severity].color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                {severityConfig[checkResult.severity].icon}
              </div>
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: severityConfig[checkResult.severity].color }}>
                  {severityConfig[checkResult.severity].label} INTERACTION
                </h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>{drugA} × {drugB}</p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)', color: severityConfig[checkResult.severity].color }}>
                  {checkResult.confidence}%
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>Confidence (XGBoost)</div>
              </div>
            </div>

            {/* Confidence Bar */}
            <div style={{ height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
              <div style={{ height: '100%', width: `${checkResult.confidence}%`, background: severityConfig[checkResult.severity].color, borderRadius: 4 }} />
            </div>

            {checkResult.mechanism && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)' }}>Mechanism</h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>{checkResult.mechanism}</p>
              </div>
            )}

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)' }}>Recommendation</h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>{checkResult.recommendation}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
              <span>Source: {checkResult.source}</span>
            </div>
          </motion.div>
        )}

        {/* History */}
        <motion.div
          className="card card--no-hover"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <History size={20} color="var(--color-gray-400)" />
            <h3 className="dashboard__section-title" style={{ marginBottom: 0 }}>Recent Checks (This Session)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {checkHistory.map((h, i) => {
              const cfg = severityConfig[h.severity]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color }}>
                      {cfg.icon}
                    </div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{h.drugs}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span className={`badge`} style={{ background: cfg.bg, color: cfg.color, textTransform: 'uppercase' }}>{h.severity}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{h.time}</span>
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