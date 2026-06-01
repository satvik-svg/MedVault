import { useState } from 'react'
import { ClipboardList, Home, Upload } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { labApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/lab/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/lab/orders', label: 'Orders', icon: <ClipboardList size={20} /> },
  { path: '/lab/upload-report', label: 'Upload Report', icon: <Upload size={20} /> },
]

export default function LabUploadReport() {
  const [form, setForm] = useState({ patientId: '', reportDate: new Date().toISOString().slice(0, 10), resultsText: 'HbA1c,6.8,%,4,5.7' })
  const [message, setMessage] = useState('')

  const submit = async () => {
    try {
      const results = form.resultsText.split('\n').map((line) => {
        const [testName, value, unit, low, high] = line.split(',').map((part) => part.trim())
        return { testName, value: Number(value), unit, referenceRange: { low: Number(low), high: Number(high) } }
      })
      const report = await labApi.uploadReport({ patientId: form.patientId, reportDate: form.reportDate, results })
      setMessage(`Report uploaded: ${report.reportNumber}`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="lab" />}>
      <div className="dashboard">
        <section className="card card--no-hover">
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>Standalone Report Upload</h1>
          <div className="form-group"><label className="form-label">Patient ID</label><input className="form-input" value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} /></div>
          <div className="form-group"><label className="form-label">Report Date</label><input className="form-input" type="date" value={form.reportDate} onChange={(event) => setForm({ ...form, reportDate: event.target.value })} /></div>
          <div className="form-group"><label className="form-label">Results CSV</label><textarea className="form-input" rows={6} value={form.resultsText} onChange={(event) => setForm({ ...form, resultsText: event.target.value })} /></div>
          <button className="btn btn-primary btn-md" onClick={submit}>Upload and Queue Blockchain Anchor</button>
          {message && <p style={{ marginTop: 'var(--space-3)', color: message.includes('uploaded') ? 'var(--color-safe)' : 'var(--color-severe)' }}>{message}</p>}
        </section>
      </div>
    </PageShell>
  )
}
