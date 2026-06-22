import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Home, Users, FileText, Activity, Settings, Bell, AlertTriangle, CheckCircle, Plus, ShieldCheck, XCircle, FlaskConical, MapPin } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import { api } from '../../lib/api.js'
import toast from 'react-hot-toast'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '#', label: 'Users', icon: <Users size={20} /> },
  { path: '#', label: 'Prescriptions', icon: <FileText size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

// Mock data for graphs
const lineData = [
  { day: '1', prescriptions: 145 },
  { day: '5', prescriptions: 130 },
  { day: '10', prescriptions: 165 },
  { day: '15', prescriptions: 180 },
  { day: '20', prescriptions: 155 },
  { day: '25', prescriptions: 190 },
  { day: '30', prescriptions: 210 },
]

export default function AdminDashboard() {
  const [queue, setQueue] = useState({ doctors: [], labs: [], memoryQueue: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('doctors')

  const fetchQueue = () => {
    setLoading(true)
    api.get('/admin/verification/queue')
      .then((data) => {
        setQueue(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handleApproveDoctor = async (id) => {
    try {
      await api.post(`/admin/verification/doctor/${id}/approve`, { notes: 'Approved via admin panel' })
      toast.success('Doctor NMC verified successfully!')
      fetchQueue()
    } catch (err) {
      toast.error(err.message || 'Verification failed')
    }
  }

  const handleRejectDoctor = async (id) => {
    const reason = prompt('Please enter rejection reason:')
    if (reason === null) return // cancelled
    try {
      await api.post(`/admin/verification/doctor/${id}/reject`, { reason: reason || 'NMC details invalid' })
      toast.success('Doctor rejected')
      fetchQueue()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    }
  }

  const handleApproveLab = async (id) => {
    try {
      await api.post(`/admin/verification/lab/${id}/approve`, { notes: 'Approved via admin panel' })
      toast.success('Lab verified successfully!')
      fetchQueue()
    } catch (err) {
      toast.error(err.message || 'Verification failed')
    }
  }

  const handleRejectLab = async (id) => {
    const reason = prompt('Please enter rejection reason:')
    if (reason === null) return // cancelled
    try {
      await api.post(`/admin/verification/lab/${id}/reject`, { reason: reason || 'Verification documents incomplete' })
      toast.success('Lab rejected')
      fetchQueue()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    }
  }

  const stats = useMemo(() => ([
    { label: 'Pending Doctors', value: String(queue.doctors?.length || 0), icon: <Users size={22} />, color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' },
    { label: 'Pending Labs', value: String(queue.labs?.length || 0), icon: <FlaskConical size={22} />, color: 'var(--color-secondary-500)', bg: '#eff6ff' },
    { label: 'System Active', value: 'Live', icon: <Activity size={22} />, color: 'var(--color-safe)', bg: 'var(--color-safe-bg)' },
    { label: 'Alerts Fired', value: '0', icon: <AlertTriangle size={22} />, color: 'var(--color-severe)', bg: 'var(--color-severe-bg)' },
  ]), [queue])

  return (
    <PageShell sidebar={<Sidebar sidebarItems={sidebarItems} items={sidebarItems} role="admin" />}>
      <div className="dashboard" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="dashboard__topbar">
          <div>
            <h1 className="dashboard__greeting">Admin Dashboard</h1>
            <p className="dashboard__date">Platform verification queue and analytics</p>
          </div>
          <div className="dashboard__topbar-actions">
            <button className="dashboard__notif-btn"><Bell size={20} /><span className="dashboard__notif-dot" /></button>
            <div className="dashboard__avatar" style={{ background: 'var(--color-gray-800)' }}>AD</div>
          </div>
        </div>

        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}

        {/* Stats */}
        <div className="dashboard__stats">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div><span className="stat-card__value">{s.value}</span><span className="stat-card__label">{s.label}</span></div>
            </motion.div>
          ))}
        </div>

        {/* Quick Assisted Onboarding Actions */}
        <section className="card card--no-hover" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="dashboard__section-title">Assisted Onboarding</h3>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link to="/admin/onboarding/doctor/new" className="btn btn-primary btn-md" style={{ display: 'inline-flex', gap: 6 }}>
              <Plus size={16} /> Onboard New Doctor
            </Link>
            <Link to="/admin/onboarding/lab/new" className="btn btn-outline btn-md" style={{ display: 'inline-flex', gap: 6, borderColor: 'var(--color-secondary-500)', color: 'var(--color-secondary-600)' }}>
              <Plus size={16} /> Onboard New Lab
            </Link>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
          
          {/* Verification Queue List */}
          <section className="card card--no-hover" style={{ minHeight: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--color-gray-100)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <h3 className="dashboard__section-title" style={{ margin: 0 }}>Verification Queue</h3>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button 
                  className={`btn btn-xs ${activeTab === 'doctors' ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setActiveTab('doctors')}
                >
                  Doctors ({queue.doctors?.length || 0})
                </button>
                <button 
                  className={`btn btn-xs ${activeTab === 'labs' ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setActiveTab('labs')}
                >
                  Labs ({queue.labs?.length || 0})
                </button>
              </div>
            </div>

            {loading && <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: 'var(--space-8)' }}>Loading verification queue...</p>}
            
            {!loading && activeTab === 'doctors' && (
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {queue.doctors?.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: 'var(--space-8)' }}>No doctors pending NMC review.</p>
                )}
                {queue.doctors?.map(doc => (
                  <div key={doc._id} style={{ padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                      <div>
                        <strong>{doc.fullName}</strong>
                        <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>
                          NMC Reg: {doc.nmcRegNumber} · {doc.stateMedicalCouncil}
                        </span>
                      </div>
                    </div>
                    {doc.verification?.nmcCertificateUrl && (
                      <a href={doc.verification.nmcCertificateUrl} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-500)', display: 'block', marginBottom: 'var(--space-3)' }}>
                        View Certificate PDF ↗
                      </a>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                      <button className="btn btn-sm btn-outline" style={{ borderColor: 'var(--color-severe)', color: 'var(--color-severe)', flex: 1, justifyContent: 'center' }} onClick={() => handleRejectDoctor(doc._id)}>
                        <XCircle size={14} style={{ marginRight: 4 }} /> Reject
                      </button>
                      <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleApproveDoctor(doc._id)}>
                        <ShieldCheck size={14} style={{ marginRight: 4 }} /> Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && activeTab === 'labs' && (
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {queue.labs?.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: 'var(--space-8)' }}>No lab partners pending review.</p>
                )}
                {queue.labs?.map(lab => (
                  <div key={lab._id} style={{ padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)' }}>
                    <div>
                      <strong>{lab.displayName}</strong>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>
                        <MapPin size={12} /> {lab.address?.line1}, {lab.address?.city || 'Bengaluru'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                      <button className="btn btn-sm btn-outline" style={{ borderColor: 'var(--color-severe)', color: 'var(--color-severe)', flex: 1, justifyContent: 'center' }} onClick={() => handleRejectLab(lab._id)}>
                        <XCircle size={14} style={{ marginRight: 4 }} /> Reject
                      </button>
                      <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleApproveLab(lab._id)}>
                        <ShieldCheck size={14} style={{ marginRight: 4 }} /> Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Analytics graph card */}
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            <section className="card card--no-hover">
              <h3 className="dashboard__section-title">Prescriptions Anchored</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Day', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="prescriptions" stroke="var(--color-primary-500)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </div>

        </div>
      </div>
    </PageShell>
  )
}
