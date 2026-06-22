import { useState } from 'react'
import { ClipboardList, Home, Upload, Plus, Trash2, CheckCircle, FileText, Loader2, Sparkles } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { labApi } from '../../lib/api.js'
import toast from 'react-hot-toast'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/lab/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/lab/orders', label: 'Orders', icon: <ClipboardList size={20} /> },
  { path: '/lab/upload-report', label: 'Upload Report', icon: <Upload size={20} /> },
]

export default function LabUploadReport() {
  const [patientId, setPatientId] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10))
  const [results, setResults] = useState([])
  const [message, setMessage] = useState('')
  
  // Custom row entry inputs
  const [newTestName, setNewTestName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newRefLow, setNewRefLow] = useState('')
  const [newRefHigh, setNewRefHigh] = useState('')

  // Simulated OCR states
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrCompleted, setOcrCompleted] = useState(false)

  const handleAddRow = () => {
    if (!newTestName.trim()) {
      toast.error('Test Name is required')
      return
    }
    if (newValue === '' || Number.isNaN(Number(newValue))) {
      toast.error('Valid numeric value is required')
      return
    }

    const newRow = {
      id: Math.random().toString(36).slice(2, 9),
      testName: newTestName.trim(),
      value: Number(newValue),
      unit: newUnit.trim() || 'units',
      referenceRange: {
        low: newRefLow !== '' ? Number(newRefLow) : undefined,
        high: newRefHigh !== '' ? Number(newRefHigh) : undefined
      }
    }

    setResults(prev => [...prev, newRow])
    
    // Clear inputs
    setNewTestName('')
    setNewValue('')
    setNewUnit('')
    setNewRefLow('')
    setNewRefHigh('')
  }

  const handleDeleteRow = (id) => {
    setResults(prev => prev.filter(r => r.id !== id))
  }

  // Simulated PDF OCR Extraction
  const handleFileDrop = (e) => {
    e.preventDefault()
    simulateOCR()
  }

  const simulateOCR = () => {
    setOcrLoading(true)
    setMessage('')
    
    setTimeout(() => {
      setResults([
        {
          id: 'ocr-1',
          testName: 'HbA1c',
          value: 6.8,
          unit: '%',
          referenceRange: { low: 4.0, high: 5.7 }
        },
        {
          id: 'ocr-2',
          testName: 'Fasting Blood Sugar',
          value: 142,
          unit: 'mg/dL',
          referenceRange: { low: 70, high: 100 }
        },
        {
          id: 'ocr-3',
          testName: 'Serum Creatinine',
          value: 1.0,
          unit: 'mg/dL',
          referenceRange: { low: 0.6, high: 1.2 }
        }
      ])
      setOcrLoading(false)
      setOcrCompleted(true)
      toast.success('AI OCR successfully extracted 3 test results!')
    }, 1500)
  }

  const submit = async () => {
    try {
      if (!patientId.trim()) {
        toast.error('Patient ID is required')
        return
      }
      if (results.length === 0) {
        toast.error('Add at least one test result before submitting')
        return
      }

      // Format payload to strip local IDs
      const formattedResults = results.map(r => ({
        testName: r.testName,
        value: r.value,
        unit: r.unit,
        referenceRange: r.referenceRange
      }))

      const report = await labApi.uploadReport({ 
        patientId, 
        reportDate, 
        results: formattedResults 
      })
      
      setMessage(`Report uploaded: ${report.reportNumber}`)
      toast.success(`Report ${report.reportNumber} saved & anchored on blockchain!`)
      
      // Reset form
      setResults([])
      setPatientId('')
      setOcrCompleted(false)
    } catch (err) {
      setMessage(err.message)
      toast.error(err.message || 'Report upload failed')
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="lab" />}>
      <div className="dashboard" style={{ maxWidth: 900, margin: '0 auto' }}>
        
        <div className="dashboard__topbar">
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>Standalone Report Upload</h1>
            <p className="dashboard__date">Digitize and anchor physical lab reports on blockchain</p>
          </div>
        </div>

        {message && <div className="card" style={{ borderLeft: '4px solid var(--color-safe)', color: 'var(--color-safe)', marginBottom: 'var(--space-6)' }}>{message}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
          
          {/* Left Panel: Results List & Manual Entry */}
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            
            {/* Step 1: Patient details */}
            <section className="card card--no-hover">
              <h3 className="dashboard__section-title">Step 1: Patient & Report Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Patient ID / MedVault ID</label>
                  <input className="form-input" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g. MV-2026-A7K3M" />
                </div>
                <div className="form-group">
                  <label className="form-label">Report Date</label>
                  <input className="form-input" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Step 3: Diagnostic Grid */}
            <section className="card card--no-hover">
              <h3 className="dashboard__section-title">Step 3: Test Results Editor</h3>
              
              {/* Dynamic Table */}
              <div style={{ overflowX: 'auto', marginBottom: 'var(--space-6)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-gray-100)', textAlign: 'left', height: 36, color: 'var(--color-gray-500)' }}>
                      <th style={{ padding: '0 8px' }}>Test Name</th>
                      <th style={{ padding: '0 8px', width: 80 }}>Value</th>
                      <th style={{ padding: '0 8px', width: 80 }}>Unit</th>
                      <th style={{ padding: '0 8px', width: 70 }}>Ref Low</th>
                      <th style={{ padding: '0 8px', width: 70 }}>Ref High</th>
                      <th style={{ padding: '0 8px', width: 50, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--color-gray-100)', height: 44 }}>
                        <td style={{ padding: '0 8px', fontWeight: 'var(--weight-semibold)' }}>{row.testName}</td>
                        <td style={{ padding: '0 8px' }}>{row.value}</td>
                        <td style={{ padding: '0 8px', color: 'var(--color-gray-600)' }}>{row.unit}</td>
                        <td style={{ padding: '0 8px', color: 'var(--color-gray-400)' }}>{row.referenceRange?.low ?? '-'}</td>
                        <td style={{ padding: '0 8px', color: 'var(--color-gray-400)' }}>{row.referenceRange?.high ?? '-'}</td>
                        <td style={{ padding: '0 8px', textAlign: 'center' }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-severe)', padding: 4 }} onClick={() => handleDeleteRow(row.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {results.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                          No test results added yet. Use AI OCR or add rows below manually.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Manual Row Entry Builder */}
              <div style={{ borderTop: '2px solid var(--color-gray-100)', paddingTop: 'var(--space-4)' }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-3)' }}>Add Custom Test Result</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--space-2)', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Test Name</label>
                    <input className="form-input form-input--sm" value={newTestName} onChange={e => setNewTestName(e.target.value)} placeholder="e.g. Cholesterol" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Value</label>
                    <input className="form-input form-input--sm" type="number" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="190" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Unit</label>
                    <input className="form-input form-input--sm" value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="mg/dL" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Ref Low</label>
                    <input className="form-input form-input--sm" type="number" value={newRefLow} onChange={e => setNewRefLow(e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Ref High</label>
                    <input className="form-input form-input--sm" type="number" value={newRefHigh} onChange={e => setNewRefHigh(e.target.value)} placeholder="200" />
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-4)', width: '100%', justifyContent: 'center' }} onClick={handleAddRow}>
                  <Plus size={14} /> Add Test Result
                </button>
              </div>
            </section>
          </div>

          {/* Right Panel: AI OCR Dropzone & Submit */}
          <div style={{ display: 'grid', gap: 'var(--space-6)', position: 'sticky', top: 'var(--space-4)' }}>
            
            {/* Step 2: AI OCR Drag Drop */}
            <section className="card card--no-hover" style={{ textAlign: 'center' }}>
              <h3 className="dashboard__section-title" style={{ textAlign: 'left' }}>Step 2: AI OCR Digitizer</h3>
              
              <div 
                onDragOver={e => e.preventDefault()} 
                onDrop={handleFileDrop}
                onClick={simulateOCR}
                style={{ 
                  border: '2px dashed var(--color-primary-300)', 
                  background: 'var(--color-primary-50)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: 'var(--space-8) var(--space-4)', 
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}
                className="hover-highlight"
              >
                {ocrLoading ? (
                  <>
                    <Loader2 size={36} className="spin text-primary-500" style={{ color: 'var(--color-primary-500)' }} />
                    <strong style={{ fontSize: 'var(--text-sm)' }}>Extracting results...</strong>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>Reading tables & reference columns</p>
                  </>
                ) : ocrCompleted ? (
                  <>
                    <CheckCircle size={36} color="var(--color-safe)" />
                    <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-safe)' }}>AI OCR Completed</strong>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>3 results populated in step 3</p>
                  </>
                ) : (
                  <>
                    <Sparkles size={36} color="var(--color-primary-500)" />
                    <strong style={{ fontSize: 'var(--text-sm)' }}>Auto-fill via AI OCR</strong>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>Click to upload PDF report or drop file here</p>
                  </>
                )}
              </div>
            </section>

            {/* Submission card */}
            <section className="card card--no-hover" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h3 className="dashboard__section-title" style={{ margin: 0 }}>Review & Submit</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', lineHeight: '1.4' }}>
                Submitting will digitize this report, map matching tests to standardized LOINC codes, and anchor the canonical hash onto the Polygon blockchain.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', background: 'var(--color-gray-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                <div><span style={{ color: 'var(--color-gray-400)' }}>Total Tests:</span> {results.length}</div>
                <div><span style={{ color: 'var(--color-gray-400)' }}>Patient Loaded:</span> {patientId ? 'Yes' : 'No'}</div>
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={submit} disabled={results.length === 0 || !patientId.trim()}>
                Verify & Anchor Report
              </button>
            </section>

          </div>
        </div>

      </div>
    </PageShell>
  )
}
