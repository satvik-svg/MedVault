import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Camera, Edit, Users, Shield, Heart, AlertCircle, ArrowRight, Search } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import PageShell from '../../components/layout/PageShell.jsx'
import { doctorApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/doctor/dashboard', label: 'Overview', icon: <Home size={20} /> },
  { path: '/doctor/scan', label: 'Scan Patient QR', icon: <Camera size={20} /> },
  { path: '/doctor/prescribe', label: 'Write Prescription', icon: <Edit size={20} /> },
  { path: '/doctor/patients', label: 'Patient List', icon: <Users size={20} /> },
  { path: '/doctor/drug-checker', label: 'Drug Checker', icon: <Search size={20} /> },
]

export default function PatientList() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    doctorApi.patients()
      .then((data) => {
        if (!alive) return
        setPatients(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message)
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="doctor" />}>
      <div className="dashboard" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="dashboard__topbar">
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)' }}>My Patients</h1>
            <p className="dashboard__date">List of patients who consulted with you</p>
          </div>
        </div>

        {error && <div className="card" style={{ borderLeft: '4px solid var(--color-severe)', color: 'var(--color-severe)' }}>{error}</div>}
        {loading && <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: 'var(--space-8)' }}>Loading patient directory...</p>}

        {!loading && !error && patients.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <Users size={48} color="var(--color-gray-400)" style={{ margin: '0 auto var(--space-4)' }} />
            <h3>No Patients Found</h3>
            <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>No consultations have been recorded yet. Scan a patient QR to start.</p>
            <Link to="/doctor/scan" className="btn btn-primary btn-md">Scan QR Code</Link>
          </div>
        )}

        {!loading && !error && patients.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {patients.map((patient) => (
              <div key={patient._id} className="card card--no-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div className="dashboard__avatar" style={{ width: 44, height: 44, fontSize: 'var(--text-sm)' }}>
                      {patient.fullName ? patient.fullName.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : 'PT'}
                    </div>
                    <div>
                      <strong style={{ fontSize: 'var(--text-md)' }}>{patient.fullName}</strong>
                      <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)' }}>{patient.medvaultId}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div><span style={{ color: 'var(--color-gray-400)' }}>Sex:</span> {patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : 'Other'}</div>
                    <div><span style={{ color: 'var(--color-gray-400)' }}>Blood Group:</span> {patient.bloodGroup || 'Unknown'}</div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-4)' }}>
                    {patient.allergies?.length > 0 && (
                      <span className="badge badge-severe" style={{ fontSize: '10px' }}>
                        <AlertCircle size={10} /> {patient.allergies.length} Allergies
                      </span>
                    )}
                    {patient.chronicConditions?.length > 0 && (
                      <span className="badge badge-moderate" style={{ fontSize: '10px' }}>
                        <Shield size={10} /> {patient.chronicConditions.length} Chronic
                      </span>
                    )}
                    {patient.activeMedications?.length > 0 && (
                      <span className="badge badge-safe" style={{ fontSize: '10px' }}>
                        <Heart size={10} /> {patient.activeMedications.length} Active Meds
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <Link to={`/doctor/patient/${patient._id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 'var(--text-xs)', justifyContent: 'center' }}>
                    View Summary
                  </Link>
                  <Link to={`/doctor/prescribe/${patient._id}`} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 'var(--text-xs)', justifyContent: 'center' }}>
                    Prescribe <ArrowRight size={12} style={{ marginLeft: 4 }} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
