import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Home, Users, FileText, Activity, Settings, Shield, Bell, AlertTriangle, CheckCircle, TrendingUp, BarChart2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '#', label: 'Users', icon: <Users size={20} /> },
  { path: '#', label: 'Prescriptions', icon: <FileText size={20} /> },
  { path: '#', label: 'Analytics', icon: <Activity size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

const stats = [
  { label: 'Total Patients', value: '12,847', icon: <Users size={22} />, color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)', trend: '+12%' },
  { label: 'Active Doctors', value: '342', icon: <Activity size={22} />, color: 'var(--color-secondary-500)', bg: '#eff6ff', trend: '+5%' },
  { label: 'Rx Today', value: '189', icon: <FileText size={22} />, color: 'var(--color-safe)', bg: 'var(--color-safe-bg)', trend: '+8%' },
  { label: 'Alerts Fired', value: '23', icon: <AlertTriangle size={22} />, color: 'var(--color-severe)', bg: 'var(--color-severe-bg)', trend: '-3%' },
]

const lineData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`, prescriptions: Math.floor(Math.random() * 80 + 120),
}))

const pieData = [
  { name: 'Safe', value: 72, color: '#16a34a' },
  { name: 'Moderate', value: 20, color: '#d97706' },
  { name: 'Severe', value: 8, color: '#dc2626' },
]

const alerts = [
  { time: '2 min ago', patient: 'Ravi Kumar', drug: 'Aspirin × Warfarin', severity: 'severe', doctor: 'Dr. Sharma', action: 'Cancelled' },
  { time: '15 min ago', patient: 'Priya Singh', drug: 'Metformin × Contrast', severity: 'moderate', doctor: 'Dr. Gupta', action: 'Proceeded' },
  { time: '1 hr ago', patient: 'Amit Patel', drug: 'Amoxicillin', severity: 'safe', doctor: 'Dr. Patel', action: 'Approved' },
  { time: '2 hr ago', patient: 'Sunita Devi', drug: 'Ciprofloxacin × Theophylline', severity: 'severe', doctor: 'Dr. Sharma', action: 'Cancelled' },
]

export default function AdminDashboard() {
  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="admin" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div><h1 className="dashboard__greeting">Admin Dashboard</h1><p className="dashboard__date">Platform-wide analytics and monitoring</p></div>
          <div className="dashboard__topbar-actions">
            <button className="dashboard__notif-btn"><Bell size={20} /><span className="dashboard__notif-dot" /></button>
            <div className="dashboard__avatar" style={{ background: 'var(--color-gray-800)' }}>AD</div>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard__stats">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <span className="stat-card__value">{s.value}</span>
                <span className="stat-card__label">{s.label}</span>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: s.trend.startsWith('+') ? 'var(--color-safe)' : 'var(--color-severe)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp size={12} /> {s.trend}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="dashboard__section-title">Prescriptions / Day (30d)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="prescriptions" stroke="#00b5b5" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="dashboard__section-title">Interaction Severity Mix</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              {pieData.map(d => <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />{d.name} {d.value}%</div>)}
            </div>
          </motion.div>
        </div>

        {/* Recent Alerts */}
        <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className="dashboard__section-title">Recent Alerts</h3>
          <div className="prescriptions-table">
            <div className="prescriptions-table__header" style={{ gridTemplateColumns: '80px 110px 1fr 80px 100px 80px' }}>
              <span>Time</span><span>Patient</span><span>Drug</span><span>Severity</span><span>Doctor</span><span>Action</span>
            </div>
            {alerts.map((a, i) => (
              <div key={i} className="prescriptions-table__row" style={{ gridTemplateColumns: '80px 110px 1fr 80px 100px 80px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{a.time}</span>
                <span>{a.patient}</span>
                <span className="prescriptions-table__drug">{a.drug}</span>
                <span><span className={`badge badge-${a.severity}`}>{a.severity}</span></span>
                <span>{a.doctor}</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>{a.action}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}
