import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Activity, AlertTriangle, Archive, Calendar, Camera, Edit, FileText, FlaskConical, Home, Pill, TestTube, Users } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { patientApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '/doctor/dashboard', label: 'Patient List', icon: <Users size={20} /> },
]

export default function PatientQuickView() {
  const { patientId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    patientApi.quickView(patientId)
      .then((payload) => alive && setData(payload))
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [patientId])

  const labTrends = useMemo(() => groupLabTrends(data?.latestLabs || []), [data])
  const patient = data?.patient || {}

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <main className="dashboard" style={{ maxWidth: 980, margin: '0 auto' }}>
        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}
        <section className="card card--no-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>{patient.fullName || 'Patient'}, {patient.sex || '-'}, {patient.age || '-'} yr</h1>
              <p style={{ color: 'var(--color-gray-500)', fontFamily: 'var(--font-mono)' }}>{patient.medvaultId} · {patient.phone || 'No phone'}</p>
              <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>{patient.city || 'City not recorded'}</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 'var(--text-sm)' }}>
              <strong>Last visit: {formatDate(data?.stats?.lastVisitDate)}</strong>
              <span style={{ display: 'block', color: 'var(--color-gray-500)' }}>Visits with you: {data?.stats?.visitsWithMe || 0}</span>
            </div>
          </div>
        </section>

        <CriticalBand patient={patient} />
        <LastVisits visits={data?.lastThreeVisits || []} />
        <LatestLabs trends={labTrends} />
        {data?.todaysPreVisit && <PreVisitCard preVisit={data.todaysPreVisit} />}

        <section className="card card--no-hover" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-md" to={`/doctor/prescribe/${patientId}?visitId=${data?.currentVisitId || ''}`}><FileText size={16} /> Write Prescription</Link>
          <Link className="btn btn-outline btn-md" to={`/doctor/order-tests/${patientId}?visitId=${data?.currentVisitId || ''}`}><TestTube size={16} /> Order Tests</Link>
          <Link className="btn btn-ghost btn-md" to="/patient/records"><Archive size={16} /> Full History</Link>
        </section>
      </main>
    </PageShell>
  )
}

function CriticalBand({ patient }) {
  return (
    <section className="card card--no-hover" style={{ borderLeft: '6px solid var(--color-severe)', background: 'var(--color-severe-bg)' }}>
      <h3 className="dashboard__section-title" style={{ color: 'var(--color-severe)' }}><AlertTriangle size={18} /> CRITICAL - READ FIRST</h3>
      <InfoLine label="ALLERGIES" value={(patient.allergies || []).map((a) => `${a.allergen} (${String(a.severity || '').toLowerCase()})`).join(', ') || 'None recorded'} />
      <InfoLine label="CHRONIC" value={(patient.chronicConditions || []).map((c) => `${c.displayName || c.icd10Code}${c.diagnosedAt ? ` since ${new Date(c.diagnosedAt).getFullYear()}` : ''}`).join(', ') || 'None recorded'} />
      <InfoLine label="ON" value={(patient.activeMedications || []).map((m) => `${m.displayName || m.genericName} ${m.strength || ''}`).join(', ') || 'No active meds'} />
    </section>
  )
}

function InfoLine({ label, value }) {
  return <p style={{ fontSize: 'var(--text-sm)', marginTop: 8 }}><strong style={{ display: 'inline-block', width: 96 }}>{label}:</strong> {value}</p>
}

function LastVisits({ visits }) {
  return (
    <section className="card card--no-hover">
      <h3 className="dashboard__section-title"><Activity size={18} /> Last 3 Visits</h3>
      {visits.length === 0 && <p style={{ color: 'var(--color-gray-500)' }}>No completed visits yet.</p>}
      {visits.map((visit) => (
        <div key={visit.visitId} style={{ display: 'grid', gridTemplateColumns: '120px 110px 1fr', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-gray-100)' }}>
          <span>{formatDate(visit.date)}</span>
          <strong>{visit.isMyVisit ? 'You' : visit.doctorName}</strong>
          <span>{visit.primaryDiagnosis || `${visit.medicationsCount} medications` || 'Consultation'}</span>
        </div>
      ))}
    </section>
  )
}

function LatestLabs({ trends }) {
  return (
    <section className="card card--no-hover">
      <h3 className="dashboard__section-title"><FlaskConical size={18} /> Latest Labs</h3>
      {trends.slice(0, 6).map((trend) => (
        <div key={trend.key} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 90px 90px 90px', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-2) 0', fontSize: 'var(--text-sm)' }}>
          <strong>{trend.testName}</strong>
          <span>{trend.latest.value} {trend.latest.unit || ''}</span>
          <span>{formatDate(trend.latest.reportDate)}</span>
          <span className={`badge ${trend.latest.flag === 'NORMAL' ? 'badge-safe' : trend.latest.flag ? 'badge-severe' : 'badge-teal'}`}>{trend.latest.flag || 'Review'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-700)' }}>{sparkline(trend.values)}</span>
        </div>
      ))}
      {!trends.length && <p style={{ color: 'var(--color-gray-500)' }}>No labs yet.</p>}
    </section>
  )
}

function PreVisitCard({ preVisit }) {
  return (
    <section className="card card--no-hover">
      <h3 className="dashboard__section-title">Today's Pre-Visit</h3>
      <p style={{ fontStyle: 'italic', color: 'var(--color-gray-700)' }}>"{preVisit.rawText}"</p>
      <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 8 }}>
        {(preVisit.aiTop3Diagnoses || []).slice(0, 3).map((dx, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
            <span>{index + 1}. {dx.condition || dx.label || dx.name || 'Suggested diagnosis'}</span>
            <strong>{dx.probability ? `${Math.round(dx.probability * 100)}%` : ''}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function groupLabTrends(results) {
  const map = new Map()
  for (const result of results) {
    const key = result.loincCode || result.testName
    const entries = map.get(key) || []
    entries.push(result)
    map.set(key, entries)
  }
  return [...map.entries()].map(([key, entries]) => {
    const sorted = entries.sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate))
    return { key, testName: sorted[0].testName, latest: sorted[0], values: sorted.slice(0, 6).reverse().map((item) => Number(item.value)).filter(Number.isFinite) }
  })
}

function sparkline(values) {
  const bars = '._-=#@'
  if (!values.length) return '------'
  const min = Math.min(...values)
  const max = Math.max(...values)
  return values.map((value) => bars[Math.min(5, Math.floor(((value - min) / Math.max(1, max - min)) * 5))]).join('')
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
