import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, QrCode, Bell, Settings, Pill, FlaskConical, Calendar, ExternalLink } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import BlockchainBadge from '../../components/BlockchainBadge.jsx'
import { patientApi } from '../../lib/api.js'
import './Dashboard.css'

const sidebarItems = [
  { path: '/patient/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/patient/records', label: 'My Records', icon: <FileText size={20} /> },
  { path: '/patient/qr', label: 'My QR Code', icon: <QrCode size={20} /> },
  { path: '#', label: 'Notifications', icon: <Bell size={20} /> },
  { path: '#', label: 'Settings', icon: <Settings size={20} /> },
]

const filters = ['All', 'Prescriptions', 'Lab Reports', 'Visits']

const typeConfig = {
  prescription: { color: 'var(--color-primary-500)', icon: <Pill size={16} /> },
  lab: { color: 'var(--color-secondary-500)', icon: <FlaskConical size={16} /> },
  visit: { color: 'var(--color-gray-400)', icon: <Calendar size={16} /> }
}

export default function MedicalRecord() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    patientApi.records()
      .then((data) => {
        if (!alive) return
        setTimeline(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message)
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  const groupedRecords = useMemo(() => {
    const groups = {}
    timeline.forEach((event) => {
      if (!event || !event.date) return
      const date = new Date(event.date)
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
      if (!groups[monthStr]) {
        groups[monthStr] = []
      }

      let type = 'visit'
      let title = 'Consultation'
      let doctor = ''
      let practice = ''
      let level = null
      let result = null
      let range = null
      let verified = false
      let blockchain = null
      let hash = null
      let recordObj = event.data || {}

      if (event.type === 'PRESCRIPTION') {
        type = 'prescription'
        title = (recordObj.medications || []).map(m => m.brandName || m.genericName).join(', ') || recordObj.notes || recordObj.diagnosisText || 'Prescription'
        doctor = recordObj.doctorId?.fullName || 'Doctor'
        practice = recordObj.doctorId?.practice?.displayName || 'Practice'
        hash = recordObj.blockchainTxHash || recordObj.blockchain?.txHash || null
        const hasAllergyConflict = recordObj.medications?.some(m => m.safetyChecks?.allergyConflict)
        const hasDdiConflict = recordObj.medications?.some(m => m.safetyChecks?.ddiConflict)
        level = hasAllergyConflict || hasDdiConflict ? 'severe' : 'safe'
        blockchain = recordObj.blockchain
      } else if (event.type === 'LAB_REPORT') {
        type = 'lab'
        title = recordObj.results?.[0]?.testName || recordObj.category || 'Lab Report'
        if (recordObj.results?.length > 1) {
          title += ` + ${recordObj.results.length - 1} more`
        }
        doctor = recordObj.orderedByDoctorId?.fullName || ''
        practice = recordObj.labId?.displayName || 'Lab Partner'
        result = recordObj.results?.[0] ? `${recordObj.results[0].value} ${recordObj.results[0].unit || ''}` : null
        const ref = recordObj.results?.[0]?.referenceRange
        range = ref ? (typeof ref === 'object' ? `${ref.low || 0} - ${ref.high || ''}` : String(ref)) : null
        verified = recordObj.isVerified || recordObj.externalUpload?.verifiedByLab || false
        blockchain = recordObj.blockchain
        hash = recordObj.blockchainTxHash || recordObj.blockchain?.txHash || null
      } else if (event.type === 'VISIT') {
        type = 'visit'
        title = recordObj.chiefComplaint || 'Consultation Visit'
        doctor = recordObj.doctorId?.fullName || 'Doctor'
        practice = recordObj.doctorId?.practice?.displayName || 'Practice'
      }

      groups[monthStr].push({
        id: recordObj.id || recordObj._id || Math.random().toString(),
        type,
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        title,
        doctor,
        practice,
        level,
        result,
        range,
        verified,
        blockchain,
        hash,
        rawRecord: recordObj,
      })
    })

    return Object.entries(groups).map(([month, items]) => ({ month, items }))
  }, [timeline])

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="patient" />}>
      <div className="dashboard">
        <div className="dashboard__topbar">
          <div><h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>Medical Records</h1><p className="dashboard__date">Timeline of your health journey</p></div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button key={f} className={`btn btn-sm ${activeFilter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveFilter(f)}>{f}</button>
          ))}
        </div>

        {/* Timeline */}
        <div className="timeline">
          {loading && <p style={{ textAlign: 'center', color: 'var(--color-gray-500)' }}>Loading records...</p>}
          {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}
          {!loading && !error && groupedRecords.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-gray-500)' }}>No medical records found.</p>
          )}

          {!loading && !error && groupedRecords.map((group, gi) => (
            <div key={group.month} className="timeline__group">
              <div className="timeline__month">{group.month}</div>
              {group.items.map((item, ii) => {
                if (activeFilter !== 'All' && activeFilter.toLowerCase() !== item.type + 's' && !(activeFilter === 'Prescriptions' && item.type === 'prescription') && !(activeFilter === 'Lab Reports' && item.type === 'lab') && !(activeFilter === 'Visits' && item.type === 'visit')) return null
                const cfg = typeConfig[item.type]
                return (
                  <motion.div key={item.id} className="timeline__item" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: ii * 0.1 }}>
                    <div className="timeline__dot" style={{ background: cfg.color }}>{cfg.icon}</div>
                    <div className="timeline__card card">
                      <div className="timeline__card-header">
                        <h4>{item.title}</h4>
                        {item.level && <span className={`badge badge-${item.level}`}>{item.level}</span>}
                      </div>
                      <p className="timeline__card-meta">
                        {item.doctor && <>{item.doctor} · {item.practice} · </>}{item.date}
                      </p>
                      {item.result && (
                        <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                          Result: <strong>{item.result}</strong> <span style={{ color: 'var(--color-gray-400)' }}>(Normal: {item.range})</span>
                          {item.verified && <span className="badge badge-safe" style={{ marginLeft: 'var(--space-2)' }}>Verified ✓</span>}
                        </p>
                      )}
                      {item.hash && (
                        <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge badge-gold">🔐 {item.hash.slice(0, 10)}...</span>
                          <a href={`/verify/${item.type === 'lab' ? 'lab-report' : 'prescription'}/${item.rawRecord.id || item.rawRecord._id}`} style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>View verification <ExternalLink size={12} /></a>
                        </div>
                      )}
                      {item.type === 'lab' && item.blockchain && (
                        <div style={{ marginTop: 'var(--space-3)' }}>
                          <BlockchainBadge record={item.rawRecord} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .timeline { position: relative; padding-left: var(--space-10); }
        .timeline::before { content: ''; position: absolute; left: 19px; top: 0; bottom: 0; width: 2px; background: var(--color-primary-200); }
        .timeline__group { margin-bottom: var(--space-8); }
        .timeline__month { font-size: var(--text-sm); font-weight: var(--weight-bold); color: var(--color-gray-400); margin-bottom: var(--space-4); text-transform: uppercase; letter-spacing: 0.05em; }
        .timeline__item { display: flex; gap: var(--space-4); margin-bottom: var(--space-4); position: relative; }
        .timeline__dot { position: absolute; left: calc(-1 * var(--space-10) + 8px); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; z-index: 1; font-size: 12px; }
        .timeline__card { flex: 1; cursor: pointer; }
        .timeline__card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
        .timeline__card-header h4 { font-size: var(--text-base); font-weight: var(--weight-bold); color: var(--color-gray-900); }
        .timeline__card-meta { font-size: var(--text-sm); color: var(--color-gray-400); }
      `}</style>
    </PageShell>
  )
}
