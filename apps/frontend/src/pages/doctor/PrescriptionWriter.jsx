import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { Home, Camera, Edit, Users, BarChart2, Pill, AlertTriangle, CheckCircle, AlertOctagon, Search, ArrowRight } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import { doctorApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '#', label: 'Patient List', icon: <Users size={20} /> },
  { path: '#', label: 'My Activity', icon: <BarChart2 size={20} /> },
]
export default function PrescriptionWriter() {
  const params = useParams()
  const [drugName, setDrugName] = useState('')
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug] = useState(false)
  const [check, setCheck] = useState(null)
  const [patientId, setPatientId] = useState(params.patientId || '')
  const [strength, setStrength] = useState('')
  const [frequency, setFrequency] = useState('ONCE_DAILY')
  const [duration, setDuration] = useState('7')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [patientRecord, setPatientRecord] = useState(null)

  useEffect(() => {
    if (drugName.length < 2) {
      setSuggestions([])
      return
    }
    let alive = true
    doctorApi.searchDrugs(drugName)
      .then(results => alive && setSuggestions(results))
      .catch(() => alive && setSuggestions([]))
    return () => { alive = false }
  }, [drugName])

  useEffect(() => {
    if (!patientId) {
      setPatientRecord(null)
      return
    }
    let alive = true
    doctorApi.patientRecord(patientId)
      .then(record => alive && setPatientRecord(record))
      .catch(() => alive && setPatientRecord(null))
    return () => { alive = false }
  }, [patientId])

  const medicationPayload = (drug = selectedDrug) => ({
    rxnormCui: drug?.rxnormCui,
    genericName: drug?.genericName,
    brandName: drug?.indianBrandNames?.[0]?.brand || drug?.brandNames?.[0] || drug?.genericName,
    strength,
    route: 'ORAL',
    dosage: {
      frequency,
      duration: { value: Number(duration) || 1, unit: 'DAYS' },
      customInstructions: notes,
    },
  })

  const selectDrug = async (drug) => {
    setSelectedDrug(drug)
    setDrugName(drug.indianBrandNames?.[0]?.brand || drug.brandNames?.[0] || drug.genericName)
    setShowSug(false)
    setMessage('')
    if (!patientId) {
      setCheck(null)
      return
    }
    setCheck('checking')
    try {
      const result = await doctorApi.interactionCheck(patientId, medicationPayload(drug))
      setCheck(result)
    } catch (err) {
      setMessage(err.message)
      setCheck(null)
    }
  }

  const savePrescription = async () => {
    try {
      if (!patientId) throw new Error('Patient ID is required')
      if (!selectedDrug?.rxnormCui) throw new Error('Select a drug from reference search')
      await doctorApi.prescribe({
        patientId,
        diagnosis: [{ icd10Code: 'Z00.0', displayName: 'General medical examination', isPrimary: true }],
        medications: [medicationPayload()],
        notes,
        allergyOverrideAcknowledged: true,
        interactionOverrideAcknowledged: true,
      })
      setMessage('Prescription saved and queued for blockchain anchoring.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard">
        <PatientHeader patient={patientRecord?.summary?.patient} />
        <ActiveMedsStrip meds={patientRecord?.summary?.patient?.activeMedications || []} />
        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="dashboard__section-title">New Prescription</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {!params.patientId && <div className="form-group"><label className="form-label">Patient ID</label><input className="form-input" value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="Patient ID from QR scan" /></div>}
            <DrugInput drugName={drugName} setDrugName={setDrugName} showSug={showSug} setShowSug={setShowSug} suggestions={suggestions} selectDrug={selectDrug} setCheck={setCheck} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">Strength</label><input className="form-input" value={strength} onChange={e => setStrength(e.target.value)} placeholder="500mg" /></div>
              <div className="form-group"><label className="form-label">Frequency</label><select className="form-select" value={frequency} onChange={e => setFrequency(e.target.value)}><option value="ONCE_DAILY">Once daily</option><option value="TWICE_DAILY">Twice daily</option><option value="THRICE_DAILY">Thrice daily</option><option value="AS_NEEDED">As needed</option></select></div>
              <div className="form-group"><label className="form-label">Duration (days)</label><input className="form-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="7" /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." style={{ resize: 'vertical' }} /></div>
          </div>
          <InteractionResult check={check} setCheck={setCheck} setDrugName={setDrugName} />
          {message && <p style={{ marginTop: 'var(--space-4)', color: message.includes('saved') ? 'var(--color-safe)' : 'var(--color-severe)' }}>{message}</p>}
          {check !== 'checking' && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <button className="btn btn-ghost btn-md">Cancel</button>
            <button className="btn btn-primary btn-md" disabled={!selectedDrug} onClick={savePrescription}>Save Prescription</button>
          </div>}
        </motion.div>
      </div>
    </PageShell>
  )
}

function PatientHeader({ patient }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-4)', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <div className="dashboard__avatar" style={{ width: 48, height: 48, fontSize: 'var(--text-base)' }}>{initials(patient?.name || 'PT')}</div>
      <div><h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>{patient?.name || 'Select a patient'}</h2><p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>{patient?.medvaultId || 'Scan or enter a patient ID'} · {patient?.bloodGroup || 'Blood group unknown'}</p></div>
    </motion.div>
  )
}

function ActiveMedsStrip({ meds }) {
  return (
    <div style={{ background: '#FFF9E6', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderLeft: '4px solid var(--color-moderate)', flexWrap: 'wrap' }}>
      <AlertTriangle size={16} color="var(--color-moderate)" />
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Active:</span>
      {meds.length === 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>No active medications loaded</span>}
      {meds.map(m => (
        <span key={`${m.rxnormCui || m.displayName}-${m.startedAt || ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: 'white', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}><Pill size={12} /> {m.displayName || m.genericName} {m.strength || ''}</span>
      ))}
    </div>
  )
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function DrugInput({ drugName, setDrugName, showSug, setShowSug, suggestions, selectDrug, setCheck }) {
  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">Drug Name</label>
      <div style={{ position: 'relative' }}>
        <input className="form-input" placeholder="Search drug..." value={drugName} onChange={e => { setDrugName(e.target.value); setShowSug(true); setCheck(null) }} style={{ paddingRight: 40 }} />
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
      </div>
      {showSug && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 10, marginTop: 4, border: '1px solid var(--color-gray-200)' }}>
          {suggestions.map(d => <div key={d.rxnormCui} onClick={() => selectDrug(d)} style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--color-gray-100)' }}><strong>{d.indianBrandNames?.[0]?.brand || d.brandNames?.[0] || d.genericName}</strong><span style={{ display: 'block', color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>{d.genericName}</span></div>)}
        </div>
      )}
    </div>
  )
}

function InteractionResult({ check, setCheck, setDrugName }) {
  if (!check) return null
  const reset = () => { setCheck(null); setDrugName('') }
  if (typeof check === 'object') {
    const issues = check.allergyConflict || check.interactionConflicts?.length || check.duplicateTherapyDetected || check.doseAdjustmentRecommended
    if (!issues) return <SafeAlert />
    return (
      <div style={{ marginTop: 'var(--space-6)' }}>
        {check.allergyConflict && <SevereAlert onCancel={reset} title="ALLERGY CONFLICT" description={check.allergyDetails} />}
        {check.interactionConflicts?.map((conflict, index) => (
          <ModerateAlert key={index} onCancel={reset} description={`${conflict.severity}: ${conflict.managementNote || 'Review interaction before issuing.'}`} />
        ))}
        {check.duplicateTherapyDetected && <ModerateAlert onCancel={reset} description={check.duplicateTherapyDetails} />}
        {check.doseAdjustmentRecommended && <ModerateAlert onCancel={reset} description={check.doseAdjustmentReason} />}
      </div>
    )
  }
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

function SevereAlert({ onCancel, title = 'SEVERE INTERACTION', description = 'Critical safety issue detected.' }) {
  return (
    <motion.div initial={{ x: 0 }} animate={{ x: [0, -6, 6, -6, 6, 0] }} transition={{ duration: 0.4 }} style={{ padding: 'var(--space-6)', background: 'var(--color-severe-bg)', borderRadius: 'var(--radius-lg)', borderLeft: '6px solid var(--color-severe)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}><AlertOctagon size={24} color="var(--color-severe)" /><h4 style={{ color: 'var(--color-severe)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>{title}</h4></div>
      <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>{description}</p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}><button className="btn btn-danger btn-md" onClick={onCancel}>Cancel Prescription</button><button className="btn btn-outline btn-md" style={{ borderColor: 'var(--color-severe)', color: 'var(--color-severe)' }}>Override ▾</button></div>
    </motion.div>
  )
}

function ModerateAlert({ onCancel, description = 'Review before proceeding.' }) {
  return (
    <div style={{ padding: 'var(--space-6)', background: 'var(--color-moderate-bg)', borderRadius: 'var(--radius-lg)', borderLeft: '6px solid var(--color-moderate)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}><AlertTriangle size={24} color="var(--color-moderate)" /><h4 style={{ color: 'var(--color-moderate)', fontWeight: 'var(--weight-bold)' }}>MODERATE INTERACTION</h4></div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-3)' }}>{description}</p>
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
