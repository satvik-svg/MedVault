import { motion } from 'framer-motion'
import { Home, Users, FileText, AlertTriangle, DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/clinic/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '#', label: 'Doctors', icon: <Users size={20} /> },
  { path: '#', label: 'Patients', icon: <Users size={20} /> },
  { path: '#', label: 'Prescriptions', icon: <FileText size={20} /> },
  { path: '#', label: 'Billing', icon: <DollarSign size={20} /> },
]

const weeklyData = [
  { week: 'W1', prescriptions: 42, interactions: 5 },
  { week: 'W2', prescriptions: 58, interactions: 8 },
  { week: 'W3', prescriptions: 51, interactions: 3 },
  { week: 'W4', prescriptions: 67, interactions: 11 },
  { week: 'W5', prescriptions: 73, interactions: 7 },
  { week: 'W6', prescriptions: 69, interactions: 9 },
]

const severityData = [
  { name: 'Safe', value: 312, color: '#16a34a' },
  { name: 'Moderate', value: 58, color: '#d97706' },
  { name: 'Severe', value: 14, color: '#dc2626' },
]

const doctors = [
  { name: 'Dr. Priya Sharma', specialty: 'Cardiology', patientsToday: 12, status: 'On Duty', statusColor: 'var(--color-safe)' },
  { name: 'Dr. Rajesh Gupta', specialty: 'Neurology', patientsToday: 8, status: 'On Duty', statusColor: 'var(--color-safe)' },
  { name: 'Dr. Ananya Patel', specialty: 'Gynecology', patientsToday: 15, status: 'Off Duty', statusColor: 'var(--color-gray-400)' },
  { name: 'Dr. Vikram Singh', specialty: 'General', patientsToday: 22, status: 'On Duty', statusColor: 'var(--color-safe)' },
]

const recentAlerts = [
  { time: '2 mins ago', type: 'severe', msg: 'Aspirin + Warfarin interaction blocked for patient RK' },
  { time: '18 mins ago', type: 'moderate', msg: 'Metformin dose adjustment suggested for patient PS' },
  { time: '1 hour ago', type: 'moderate', msg: 'Omeprazole + Clopidogrel interaction flagged for patient AM' },
  { time: '2 hours ago', type: 'safe', msg: 'New prescription approved for patient LT' },
]

const severityColors = {
  severe: 'var(--color-severe)',
  moderate: 'var(--color-moderate)',
  safe: 'var(--color-safe)',
}

export default function ClinicDashboard() {
  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="clinic" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div>
            <h1 className="dashboard__greeting">Admin Dashboard 🏥</h1>
            <p className="dashboard__date">MedVault Clinic · Monday, April 14, 2025</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>SaaS Plan</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-primary-500)' }}>Professional</div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="dashboard__stats">
          {[
            { label: 'Active Patients', value: '247', icon: <Users size={22} />, color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' },
            { label: 'Doctors On Duty', value: '3', icon: <CheckCircle size={22} />, color: 'var(--color-safe)', bg: 'var(--color-safe-bg)' },
            { label: 'Prescriptions Today', value: '34', icon: <FileText size={22} />, color: 'var(--color-secondary-500)', bg: '#eff6ff' },
            { label: 'Interactions Flagged', value: '7', icon: <AlertTriangle size={22} />, color: 'var(--color-severe)', bg: 'var(--color-severe-bg)' },
          ].map((stat, i) => (
            <motion.div key={stat.label} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="stat-card__icon" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
              <div><span className="stat-card__value">{stat.value}</span><span className="stat-card__label">{stat.label}</span></div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          {/* Line Chart - Weekly Prescriptions */}
          <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
              <h3 className="dashboard__section-title" style={{ marginBottom: 0 }}>Prescription Trends</h3>
              <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-primary-500)' }} />Prescriptions</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-severe)' }} />Interactions</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--color-gray-400)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-gray-400)' }} />
                <Tooltip />
                <Line type="monotone" dataKey="prescriptions" stroke="var(--color-primary-500)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="interactions" stroke="var(--color-severe)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie Chart - Interaction Mix */}
          <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="dashboard__section-title" style={{ marginBottom: 'var(--space-4)' }}>Interaction Severity Mix</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {severityData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
              {severityData.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--color-gray-600)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Doctors & Alerts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          {/* Doctor List */}
          <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="dashboard__section-title">Doctors on Duty</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {doctors.map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div className="dashboard__avatar" style={{ width: 36, height: 36, fontSize: 'var(--text-xs)' }}>
                      {doc.name.split(' ').slice(1).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{doc.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{doc.specialty} · {doc.patientsToday} patients today</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: doc.statusColor }}>{doc.status}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Alerts */}
          <motion.div className="card card--no-hover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={18} color="var(--color-severe)" />
              <h3 className="dashboard__section-title" style={{ marginBottom: 0 }}>Recent Interaction Alerts</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {recentAlerts.map((alert, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: severityColors[alert.type], marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', lineHeight: 1.5 }}>{alert.msg}</p>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 2, display: 'block' }}>{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Billing / SaaS Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', background: 'linear-gradient(135deg, var(--color-primary-50), #eff6ff)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--color-primary-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-gray-900)' }}>Professional Plan Active</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginTop: 4 }}>247/500 patients used this month · Renews in 18 days</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-primary-500)' }}>₹9,999<span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-normal)', color: 'var(--color-gray-400)' }}>/mo</span></div>
            </div>
            <button className="btn btn-outline btn-md" style={{ borderColor: 'var(--color-primary-500)', color: 'var(--color-primary-500)' }}>
              Upgrade Plan
            </button>
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}