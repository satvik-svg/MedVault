import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Camera, Edit, Home, TestTube, Users, Search } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import LabPicker from '../../components/doctor/LabPicker.jsx'
import { api } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '/doctor/patients', label: 'Patient List', icon: <Users size={20} /> },
  { path: '/doctor/drug-checker', label: 'Drug Checker', icon: <Search size={20} /> },
]

const commonTests = [
  { loincCode: '4548-4', displayName: 'HbA1c' },
  { loincCode: '1558-6', displayName: 'Fasting Blood Sugar' },
  { loincCode: '2160-0', displayName: 'Creatinine' },
  { loincCode: '718-7', displayName: 'Hemoglobin' },
]

export default function OrderTests() {
  const { patientId } = useParams()
  const [params] = useSearchParams()
  const [selectedTests, setSelectedTests] = useState(commonTests.slice(0, 2))
  const [labId, setLabId] = useState('')
  const [message, setMessage] = useState('')

  const submit = async () => {
    try {
      if (!labId) throw new Error('Choose a lab or let patient choose alternate lab')
      const order = await api.post('/lab-orders', {
        patientId,
        visitId: params.get('visitId'),
        labId,
        tests: selectedTests,
      })
      setMessage(`Lab order created: ${order.orderNumber}`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard">
        <section className="card card--no-hover">
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}><TestTube size={20} /> Order Tests</h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
            {commonTests.map((test) => {
              const checked = selectedTests.some((item) => item.loincCode === test.loincCode)
              return <button key={test.loincCode} className={`btn btn-sm ${checked ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedTests(checked ? selectedTests.filter((item) => item.loincCode !== test.loincCode) : [...selectedTests, test])}>{test.displayName}</button>
            })}
          </div>
        </section>
        <LabPicker loincCodes={selectedTests.map((test) => test.loincCode)} city="Noida" onSelect={setLabId} onSkip={() => setMessage('Patient can use alternate lab from their app.')} />
        <section className="card card--no-hover">
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Selected lab: {labId || 'None'}</p>
          <button className="btn btn-primary btn-md" onClick={submit}>Create Lab Order</button>
          {message && <p style={{ marginTop: 'var(--space-3)', color: message.includes('created') || message.includes('alternate') ? 'var(--color-safe)' : 'var(--color-severe)' }}>{message}</p>}
        </section>
      </div>
    </PageShell>
  )
}
