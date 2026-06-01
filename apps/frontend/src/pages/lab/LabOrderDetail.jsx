import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ClipboardList, Home, Send, Upload } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { labApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/lab/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/lab/orders', label: 'Orders', icon: <ClipboardList size={20} /> },
  { path: '/lab/upload-report', label: 'Upload Report', icon: <Upload size={20} /> },
]

const nextStatuses = ['ACKNOWLEDGED_BY_LAB', 'PATIENT_VISITED', 'SAMPLE_COLLECTED', 'IN_PROCESSING']

export default function LabOrderDetail() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [results, setResults] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    labApi.order(orderId).then((payload) => {
      setOrder(payload)
      setResults((payload.tests || []).map((test) => ({ loincCode: test.loincCode, testName: test.displayName, value: '', unit: '', referenceRange: {} })))
    }).catch((err) => setMessage(err.message))
  }, [orderId])

  const updateStatus = async (newStatus) => {
    try {
      setOrder(await labApi.updateOrderStatus(orderId, newStatus))
      setMessage(`Status updated to ${newStatus}`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  const submitReport = async () => {
    try {
      const report = await labApi.uploadOrderReport(orderId, { method: 'STRUCTURED', results, reportDate: new Date().toISOString() })
      setMessage(`Report uploaded: ${report.reportNumber}`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="lab" />}>
      <div className="dashboard">
        <section className="card card--no-hover">
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>{order?.orderNumber || 'Lab Order'}</h1>
          <p style={{ color: 'var(--color-gray-500)' }}>{order?.patientId?.fullName || 'Patient'} · Dr. {order?.doctorId?.fullName || 'Doctor'} · <span className="badge badge-teal">{order?.status}</span></p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
            {nextStatuses.map((status) => <button key={status} className="btn btn-outline btn-sm" onClick={() => updateStatus(status)}>{status.replaceAll('_', ' ')}</button>)}
          </div>
        </section>
        <section className="card card--no-hover">
          <h3 className="dashboard__section-title">Upload Report</h3>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {results.map((result, index) => (
              <div key={result.loincCode || index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--space-2)', alignItems: 'end' }}>
                <strong>{result.testName}</strong>
                <input className="form-input" placeholder="Value" value={result.value} onChange={(event) => updateResult(index, 'value', event.target.value, results, setResults)} />
                <input className="form-input" placeholder="Unit" value={result.unit} onChange={(event) => updateResult(index, 'unit', event.target.value, results, setResults)} />
                <input className="form-input" placeholder="Ref low" onChange={(event) => updateRange(index, 'low', event.target.value, results, setResults)} />
                <input className="form-input" placeholder="Ref high" onChange={(event) => updateRange(index, 'high', event.target.value, results, setResults)} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-md" style={{ marginTop: 'var(--space-4)' }} onClick={submitReport}><Send size={16} /> Send Report</button>
          {message && <p style={{ marginTop: 'var(--space-3)', color: message.includes('uploaded') || message.includes('updated') ? 'var(--color-safe)' : 'var(--color-severe)' }}>{message}</p>}
        </section>
      </div>
    </PageShell>
  )
}

function updateResult(index, key, value, results, setResults) {
  setResults(results.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === 'value' && !Number.isNaN(Number(value)) ? Number(value) : value } : item))
}

function updateRange(index, key, value, results, setResults) {
  setResults(results.map((item, itemIndex) => itemIndex === index ? { ...item, referenceRange: { ...item.referenceRange, [key]: Number(value) } } : item))
}
