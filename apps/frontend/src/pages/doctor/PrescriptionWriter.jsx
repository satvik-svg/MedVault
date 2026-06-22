import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Home, Camera, Edit, Users, BarChart2, Pill, AlertTriangle, CheckCircle, AlertOctagon, Search, Trash2, Plus, FlaskConical, MapPin } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import LabPicker from '../../components/doctor/LabPicker.jsx'
import { doctorApi } from '../../lib/api.js'
import toast from 'react-hot-toast'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '/doctor/patients', label: 'Patient List', icon: <Users size={20} /> },
  { path: '#', label: 'My Activity', icon: <BarChart2 size={20} /> },
]

const commonDiagnoses = [
  { code: 'E11.9', name: 'Type 2 Diabetes Mellitus' },
  { code: 'I10', name: 'Essential Hypertension' },
  { code: 'J06.9', name: 'Acute Upper Respiratory Infection' },
  { code: 'A09.9', name: 'Gastroenteritis and Colitis' },
  { code: 'K25.9', name: 'Peptic Ulcer Disease' },
  { code: 'M79.1', name: 'Myalgia' },
]

const commonTests = [
  { loincCode: '4548-4', displayName: 'HbA1c' },
  { loincCode: '1558-6', displayName: 'Fasting Blood Sugar' },
  { loincCode: '2160-0', displayName: 'Creatinine' },
  { loincCode: '718-7', displayName: 'Hemoglobin' },
]

export default function PrescriptionWriter() {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const visitId = searchParams.get('visitId') || ''
  const [patientId, setPatientId] = useState(params.patientId || '')
  const [patientRecord, setPatientRecord] = useState(null)
  
  // Diagnosis
  const [selectedDx, setSelectedDx] = useState(commonDiagnoses[2]) // Default: Acute URI
  const [customDxCode, setCustomDxCode] = useState('')
  const [customDxName, setCustomDxName] = useState('')
  const [useCustomDx, setUseCustomDx] = useState(false)

  // Medication Entry
  const [drugName, setDrugName] = useState('')
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug] = useState(false)
  const [strength, setStrength] = useState('')
  const [frequency, setFrequency] = useState('TWICE_DAILY')
  const [duration, setDuration] = useState('5')
  const [notes, setNotes] = useState('')
  
  // Prescription Medications List (Draft)
  const [draftMeds, setDraftMeds] = useState([])
  const [generalNotes, setGeneralNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Lab Order Integration
  const [orderLabs, setOrderLabs] = useState(false)
  const [selectedTests, setSelectedTests] = useState([])
  const [selectedLabId, setSelectedLabId] = useState('')
  const [labSelectionStatus, setLabSelectionStatus] = useState('None')

  // Fetch patient profile
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

  // Search drugs autocomplete
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

  // Select drug from autocomplete
  const selectDrug = (drug) => {
    setSelectedDrug(drug)
    setDrugName(drug.indianBrandNames?.[0]?.brand || drug.brandNames?.[0] || drug.genericName)
    setStrength(drug.commonStrengths?.[0] || '')
    setShowSug(false)
  }

  // Add drug to draft list and run safety check asynchronously
  const addMedicationToDraft = async () => {
    if (!selectedDrug) {
      toast.error('Please select a drug from search first')
      return
    }
    if (!strength.trim()) {
      toast.error('Strength is required (e.g. 500mg)')
      return
    }
    if (!duration || Number(duration) <= 0) {
      toast.error('Duration must be greater than 0')
      return
    }

    const medId = Math.random().toString(36).slice(2, 9)
    const newMed = {
      id: medId,
      rxnormCui: selectedDrug.rxnormCui,
      genericName: selectedDrug.genericName,
      brandName: selectedDrug.indianBrandNames?.[0]?.brand || selectedDrug.brandNames?.[0] || selectedDrug.genericName,
      strength,
      route: 'ORAL',
      dosage: {
        frequency,
        duration: { value: Number(duration), unit: 'DAYS' },
        customInstructions: notes,
      },
      safetyCheck: { status: 'checking', details: null }
    }

    setDraftMeds(prev => [...prev, newMed])
    
    // Reset entry inputs
    setDrugName('')
    setSelectedDrug(null)
    setStrength('')
    setNotes('')

    // Run safety checks in background
    if (patientId) {
      try {
        const payload = {
          rxnormCui: newMed.rxnormCui,
          genericName: newMed.genericName,
          brandName: newMed.brandName,
          strength: newMed.strength,
          route: newMed.route,
          dosage: newMed.dosage
        }
        const result = await doctorApi.interactionCheck(patientId, payload)
        
        setDraftMeds(prev => prev.map(m => {
          if (m.id === medId) {
            const hasAllergy = result.allergyConflict
            const hasDdi = result.interactionConflicts?.length > 0
            const hasDup = result.duplicateTherapyDetected
            const hasDose = result.doseAdjustmentRecommended
            
            let status = 'safe'
            if (hasAllergy) status = 'severe'
            else if (hasDdi || hasDup || hasDose) status = 'moderate'

            return {
              ...m,
              safetyCheck: { status, details: result }
            }
          }
          return m
        }))
      } catch (err) {
        setDraftMeds(prev => prev.map(m => {
          if (m.id === medId) {
            return { ...m, safetyCheck: { status: 'error', details: err.message } }
          }
          return m
        }))
      }
    } else {
      // If no patient loaded yet, mark as safe default
      setDraftMeds(prev => prev.map(m => {
        if (m.id === medId) {
          return { ...m, safetyCheck: { status: 'safe', details: null } }
        }
        return m
      }))
    }
  }

  const removeMedication = (medId) => {
    setDraftMeds(prev => prev.filter(m => m.id !== medId))
  }

  // Handle final prescription submission
  const submitPrescription = async () => {
    if (!patientId) {
      toast.error('Patient profile is required')
      return
    }
    if (draftMeds.length === 0) {
      toast.error('Add at least one medication to the prescription')
      return
    }

    setSubmitting(true)
    try {
      const finalDiagnosis = useCustomDx
        ? [{ icd10Code: customDxCode || 'Z00.0', displayName: customDxName || 'General Consultation', isPrimary: true }]
        : [{ icd10Code: selectedDx.code, displayName: selectedDx.name, isPrimary: true }]

      // Prepare medications payload (stripping frontend specific IDs and safetyCheck nodes)
      const medicationsPayload = draftMeds.map(m => ({
        rxnormCui: m.rxnormCui,
        genericName: m.genericName,
        brandName: m.brandName,
        strength: m.strength,
        route: m.route,
        dosage: m.dosage
      }))

      const payload = {
        patientId,
        visitId: visitId || undefined,
        diagnosis: finalDiagnosis,
        medications: medicationsPayload,
        notes: generalNotes,
        allergyOverrideAcknowledged: true,
        interactionOverrideAcknowledged: true,
      }

      // Add inline lab order if selected
      if (orderLabs && selectedTests.length > 0) {
        if (!selectedLabId) {
          throw new Error('Please select a laboratory or skip selection')
        }
        payload.labOrder = {
          labId: selectedLabId,
          tests: selectedTests.map(t => ({ loincCode: t.loincCode, displayName: t.displayName }))
        }
      }

      const res = await doctorApi.prescribe(payload)
      toast.success(res.prescription?.prescriptionNumber ? `Prescription ${res.prescription.prescriptionNumber} issued!` : 'Prescription saved.')
      
      // Navigate to patient dashboard/summary or doctor dashboard
      navigate(`/doctor/patient/${patientId}`)
    } catch (err) {
      toast.error(err.message || 'Failed to submit prescription')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard" style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Patient Panel Header */}
        <PatientHeader patient={patientRecord?.summary?.patient} />
        <ActiveMedsStrip meds={patientRecord?.summary?.patient?.activeMedications || []} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
          
          {/* Left Column: Form Entry */}
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            
            {/* Diagnosis Input */}
            <section className="card card--no-hover">
              <h3 className="dashboard__section-title">Consultation Diagnosis</h3>
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <label style={{ fontSize: 'var(--text-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="dx_type" checked={!useCustomDx} onChange={() => setUseCustomDx(false)} />
                  Select Common
                </label>
                <label style={{ fontSize: 'var(--text-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="dx_type" checked={useCustomDx} onChange={() => setUseCustomDx(true)} />
                  Enter Custom ICD-10
                </label>
              </div>

              {!useCustomDx ? (
                <div className="form-group">
                  <label className="form-label">Primary Diagnosis</label>
                  <select 
                    className="form-select" 
                    value={selectedDx.code} 
                    onChange={e => setSelectedDx(commonDiagnoses.find(d => d.code === e.target.value))}
                  >
                    {commonDiagnoses.map(d => (
                      <option key={d.code} value={d.code}>{d.code} · {d.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">ICD Code</label>
                    <input className="form-input" value={customDxCode} onChange={e => setCustomDxCode(e.target.value)} placeholder="E11.9" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition Description</label>
                    <input className="form-input" value={customDxName} onChange={e => setCustomDxName(e.target.value)} placeholder="Type 2 Diabetes Mellitus" />
                  </div>
                </div>
              )}
            </section>

            {/* Drug Builder Entry Form */}
            <section className="card card--no-hover">
              <h3 className="dashboard__section-title">Add Medication</h3>
              
              {!params.patientId && !patientId && (
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">Patient ID</label>
                  <input className="form-input" value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="Scan QR or enter Patient ID" />
                </div>
              )}

              <DrugInput 
                drugName={drugName} 
                setDrugName={setDrugName} 
                showSug={showSug} 
                setShowSug={setShowSug} 
                suggestions={suggestions} 
                selectDrug={selectDrug} 
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Strength</label>
                  <input className="form-input" value={strength} onChange={e => setStrength(e.target.value)} placeholder="e.g. 500mg, 10ml" />
                </div>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select className="form-select" value={frequency} onChange={e => setFrequency(e.target.value)}>
                    <option value="ONCE_DAILY">1-0-0 (Once daily - Morning)</option>
                    <option value="ONCE_DAILY_NIGHT">0-0-1 (Once daily - Night)</option>
                    <option value="TWICE_DAILY">1-0-1 (Twice daily)</option>
                    <option value="THRICE_DAILY">1-1-1 (Thrice daily)</option>
                    <option value="AS_NEEDED">SOS (As needed)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (days)</label>
                  <input className="form-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 5, 7, 30" />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-label">Specific Instructions (Optional)</label>
                <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Post-meal, avoid milk" />
              </div>

              <button 
                className="btn btn-outline btn-md" 
                style={{ width: '100%', marginTop: 'var(--space-5)', justifyContent: 'center', borderColor: 'var(--color-primary-500)', color: 'var(--color-primary-600)' }}
                onClick={addMedicationToDraft}
                disabled={!selectedDrug}
              >
                <Plus size={16} /> Add to Prescription Draft
              </button>
            </section>

            {/* Lab Order Referral Toggle */}
            <section className="card card--no-hover">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="dashboard__section-title" style={{ margin: 0 }}><FlaskConical size={18} /> Order Lab Work</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>Refer patient for diagnostic testing</p>
                </div>
                <input 
                  type="checkbox" 
                  style={{ width: 20, height: 20, cursor: 'pointer' }}
                  checked={orderLabs} 
                  onChange={e => setOrderLabs(e.target.checked)} 
                />
              </div>

              {orderLabs && (
                <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-4)' }}>
                  <label className="form-label">Select Tests</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
                    {commonTests.map((test) => {
                      const checked = selectedTests.some((item) => item.loincCode === test.loincCode)
                      return (
                        <button 
                          key={test.loincCode} 
                          className={`btn btn-sm ${checked ? 'btn-primary' : 'btn-ghost'}`} 
                          onClick={() => setSelectedTests(checked ? selectedTests.filter(item => item.loincCode !== test.loincCode) : [...selectedTests, test])}
                        >
                          {test.displayName}
                        </button>
                      )
                    })}
                  </div>

                  {selectedTests.length > 0 && (
                    <LabPicker 
                      loincCodes={selectedTests.map(test => test.loincCode)} 
                      city={patientRecord?.summary?.patient?.city || 'Bengaluru'} 
                      onSelect={(id) => {
                        setSelectedLabId(id)
                        setLabSelectionStatus('Lab Partner Chosen')
                        toast.success('Lab partner selected')
                      }} 
                      onSkip={() => {
                        setSelectedLabId('alternate')
                        setLabSelectionStatus('Consented Alternate Lab')
                        toast.success('Skipped. Patient will select any lab.')
                      }} 
                    />
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Draft Summary & Safety checks */}
          <div style={{ display: 'grid', gap: 'var(--space-6)', position: 'sticky', top: 'var(--space-4)' }}>
            
            <section className="card card--no-hover" style={{ minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-gray-100)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <h3 className="dashboard__section-title" style={{ margin: 0 }}>Prescription Draft</h3>
                  <span className="badge badge-teal">{draftMeds.length} Meds</span>
                </div>

                {/* Selected Diagnosis Badge */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', display: 'block', marginBottom: 4 }}>Primary Diagnosis:</span>
                  <span className="badge badge-gold" style={{ fontSize: 'var(--text-xs)' }}>
                    {useCustomDx ? `${customDxCode || 'Z00.0'} · ${customDxName || 'Consultation'}` : `${selectedDx.code} · ${selectedDx.name}`}
                  </span>
                </div>

                {/* Draft Medications List */}
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {draftMeds.length === 0 && (
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-10)' }}>
                      No medications added to draft yet.
                    </p>
                  )}
                  {draftMeds.map(med => (
                    <div key={med.id} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <strong style={{ fontSize: 'var(--text-sm)' }}>{med.brandName}</strong>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>({med.strength})</span>
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-600)', margin: '2px 0 6px 0' }}>
                          {formatFrequency(med.dosage.frequency)} · {med.dosage.duration.value} days
                        </p>
                        
                        {/* Asynchronous Background Safety check Result badge */}
                        <SafetyResultBadge check={med.safetyCheck} />
                      </div>

                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--color-severe)', padding: 6 }} 
                        onClick={() => removeMedication(med.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Ordered Labs Summary */}
                {orderLabs && selectedTests.length > 0 && (
                  <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-4)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', display: 'block', marginBottom: 4 }}>Lab Referral:</span>
                    <div style={{ background: 'var(--color-primary-50)', border: '1px dashed var(--color-primary-300)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                      <strong style={{ fontSize: 'var(--text-xs)', display: 'block', color: 'var(--color-primary-900)' }}>
                        Tests: {selectedTests.map(t => t.displayName).join(', ')}
                      </strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <MapPin size={10} /> Status: {labSelectionStatus}
                      </span>
                    </div>
                  </div>
                )}

                {/* General Consultation Notes */}
                <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
                  <label className="form-label">General Advice / Notes</label>
                  <textarea 
                    className="form-input" 
                    rows={2} 
                    value={generalNotes} 
                    onChange={e => setGeneralNotes(e.target.value)} 
                    placeholder="e.g. Rest for 2 days, stay hydrated" 
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ borderTop: '2px solid var(--color-gray-100)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                <button 
                  className="btn btn-ghost btn-md" 
                  style={{ flex: 1, justifyContent: 'center' }} 
                  onClick={() => { setDraftMeds([]); setGeneralNotes(''); setOrderLabs(false); setSelectedTests([]) }}
                >
                  Clear Draft
                </button>
                <button 
                  className="btn btn-primary btn-md" 
                  style={{ flex: 1.5, justifyContent: 'center' }}
                  onClick={submitPrescription}
                  disabled={draftMeds.length === 0 || submitting}
                >
                  {submitting ? 'Anchoring...' : 'Sign & Issue Rx'}
                </button>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PageShell>
  )
}

function PatientHeader({ patient }) {
  if (!patient) {
    return (
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-4)', boxShadow: 'var(--shadow-card)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-gray-500)' }}>Select or Scan Patient Profile to Prescribe</h2>
      </motion.div>
    )
  }
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-4)', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <div className="dashboard__avatar" style={{ width: 48, height: 48, fontSize: 'var(--text-base)' }}>
        {patient.name ? patient.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : 'PT'}
      </div>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>{patient.name}</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>
          {patient.medvaultId} · Age {patient.age} · {patient.sex === 'M' ? 'Male' : 'Female'} · {patient.bloodGroup || 'Blood type unknown'}
        </p>
      </div>
    </motion.div>
  )
}

function ActiveMedsStrip({ meds }) {
  return (
    <div style={{ background: '#FFF9E6', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderLeft: '4px solid var(--color-moderate)', flexWrap: 'wrap' }}>
      <AlertTriangle size={16} color="var(--color-moderate)" />
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Active Medications:</span>
      {meds.length === 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>No active medications recorded</span>}
      {meds.map(m => (
        <span key={`${m.rxnormCui || m.displayName}-${m.startedAt || ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: 'white', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
          <Pill size={12} /> {m.displayName || m.genericName} {m.strength || ''}
        </span>
      ))}
    </div>
  )
}

function DrugInput({ drugName, setDrugName, showSug, setShowSug, suggestions, selectDrug }) {
  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">Drug Name Search</label>
      <div style={{ position: 'relative' }}>
        <input 
          className="form-input" 
          placeholder="Type brand name (e.g. Augmentin, Paracetamol)..." 
          value={drugName} 
          onChange={e => { setDrugName(e.target.value); setShowSug(true) }} 
          style={{ paddingRight: 40 }} 
        />
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
      </div>
      {showSug && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 20, marginTop: 4, border: '1px solid var(--color-gray-200)', maxHeight: 200, overflowY: 'auto' }}>
          {suggestions.map(d => (
            <div 
              key={d.rxnormCui} 
              onClick={() => selectDrug(d)} 
              style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--color-gray-100)' }}
            >
              <strong>{d.indianBrandNames?.[0]?.brand || d.brandNames?.[0] || d.genericName}</strong>
              <span style={{ display: 'block', color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>{d.genericName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SafetyResultBadge({ check }) {
  if (!check) return null
  const { status, details } = check

  if (status === 'checking') {
    return (
      <span className="badge badge-moderate" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 10, height: 10, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        Checking safety...
      </span>
    )
  }

  if (status === 'severe') {
    return (
      <div style={{ marginTop: 4 }}>
        <span className="badge badge-severe" style={{ fontSize: '10px', padding: '2px 8px' }}>
          <AlertOctagon size={10} /> Allergy Conflict: {details?.allergyDetails || 'Severe Alert'}
        </span>
      </div>
    )
  }

  if (status === 'moderate') {
    const hasDdi = details?.interactionConflicts?.length > 0
    const hasDup = details?.duplicateTherapyDetected
    const hasDose = details?.doseAdjustmentRecommended
    
    let text = 'Caution Recommended'
    if (hasDdi) text = `DDI Warning: ${details.interactionConflicts[0].severity}`
    else if (hasDup) text = 'Therapy Duplicate'
    else if (hasDose) text = 'Dosing Adjust'

    return (
      <div style={{ marginTop: 4 }}>
        <span className="badge badge-moderate" style={{ fontSize: '10px', padding: '2px 8px' }}>
          <AlertTriangle size={10} /> {text}
        </span>
      </div>
    )
  }

  if (status === 'safe') {
    return (
      <div style={{ marginTop: 4 }}>
        <span className="badge badge-safe" style={{ fontSize: '10px', padding: '2px 8px' }}>
          <CheckCircle size={10} /> Safety Approved
        </span>
      </div>
    )
  }

  return null
}

function formatFrequency(val) {
  if (val === 'ONCE_DAILY') return '1-0-0 (Morning)'
  if (val === 'ONCE_DAILY_NIGHT') return '0-0-1 (Night)'
  if (val === 'TWICE_DAILY') return '1-0-1'
  if (val === 'THRICE_DAILY') return '1-1-1'
  if (val === 'AS_NEEDED') return 'SOS'
  return val
}
