import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, ClipboardList, FlaskConical, Home, Upload } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { labApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/lab/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/lab/orders', label: 'Orders', icon: <ClipboardList size={20} /> },
  { path: '/lab/upload-report', label: 'Upload Report', icon: <Upload size={20} /> },
]

export default function LabDashboard() {
  const [lab, setLab] = useState(null)
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([labApi.me(), labApi.pendingOrders()])
      .then(([labData, orderData]) => {
        if (!alive) return
        setLab(labData)
        setOrders(orderData)
      })
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [])

  const stats = useMemo(() => ([
    { label: "Today's Orders", value: orders.length },
    { label: 'Pending Reports', value: orders.filter((order) => ['SAMPLE_COLLECTED', 'IN_PROCESSING'].includes(order.status)).length },
    { label: 'Completed Today', value: orders.filter((order) => order.status === 'DELIVERED_TO_DOCTOR').length },
    { label: 'Avg TAT', value: '24h' },
  ]), [orders])

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="lab" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div>
            <h1 className="dashboard__greeting">{lab?.displayName || 'Lab Dashboard'}</h1>
            <p className="dashboard__date">{lab?.address?.city || 'Partner lab'} · Report upload and order queue</p>
          </div>
        </div>
        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}
        <div className="dashboard__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-card__icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}><BarChart2 size={22} /></div>
              <div><span className="stat-card__value">{stat.value}</span><span className="stat-card__label">{stat.label}</span></div>
            </div>
          ))}
        </div>
        <section className="card card--no-hover">
          <h3 className="dashboard__section-title"><FlaskConical size={18} /> Recent Orders</h3>
          <OrderTable orders={orders.slice(0, 8)} />
        </section>
      </div>
    </PageShell>
  )
}

export function OrderTable({ orders }) {
  if (!orders.length) return <p style={{ color: 'var(--color-gray-500)' }}>No active orders.</p>
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {orders.map((order) => (
        <Link key={order._id} to={`/lab/orders/${order._id}`} className="card" style={{ padding: 'var(--space-4)', textDecoration: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <div>
              <strong>{order.patientId?.fullName || 'Patient'}</strong>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>From Dr. {order.doctorId?.fullName || 'Doctor'} · {(order.tests || []).map((test) => test.displayName).join(', ')}</p>
            </div>
            <span className="badge badge-teal">{order.status}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
