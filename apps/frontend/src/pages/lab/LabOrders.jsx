import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Home, Upload } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { labApi } from '../../lib/api.js'
import { OrderTable } from './LabDashboard.jsx'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/lab/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/lab/orders', label: 'Orders', icon: <ClipboardList size={20} /> },
  { path: '/lab/upload-report', label: 'Upload Report', icon: <Upload size={20} /> },
]

const statuses = ['ALL', 'PATIENT_NOTIFIED', 'ACKNOWLEDGED_BY_LAB', 'SAMPLE_COLLECTED', 'IN_PROCESSING', 'REPORT_UPLOADED']

export default function LabOrders() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('ALL')
  const [error, setError] = useState('')

  useEffect(() => {
    labApi.pendingOrders().then(setOrders).catch((err) => setError(err.message))
  }, [])

  const filtered = useMemo(() => status === 'ALL' ? orders : orders.filter((order) => order.status === status), [orders, status])

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="lab" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div><h1 className="dashboard__greeting">Orders Queue</h1><p className="dashboard__date">Track samples from arrival to report upload</p></div>
        </div>
        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          {statuses.map((item) => <button key={item} className={`btn btn-sm ${status === item ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatus(item)}>{item.replaceAll('_', ' ')}</button>)}
        </div>
        <section className="card card--no-hover"><OrderTable orders={filtered} /></section>
      </div>
    </PageShell>
  )
}
