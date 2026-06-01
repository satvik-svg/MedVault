import { useState } from 'react'
import { Home, Stethoscope, UserPlus } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { onboardingApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/admin/onboarding/doctor/new', label: 'New Doctor', icon: <Stethoscope size={20} /> },
  { path: '/admin/onboarding/lab/new', label: 'New Lab', icon: <UserPlus size={20} /> },
]

export default function DoctorOnboarding() {
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', email: '', nmcRegNumber: '', stateMedicalCouncil: '', specialization: 'General Physician', city: '', consultationFee: '' })
  const [message, setMessage] = useState('')

  const submit = async () => {
    try {
      const result = await onboardingApi.doctor({
        ...form,
        specializations: [{ displayName: form.specialization, isPrimary: true }],
        practice: { displayName: `${form.fullName}'s Practice`, address: { city: form.city }, consultationFee: Number(form.consultationFee) || undefined },
      })
      setMessage(`Doctor queued for review. Temporary password: ${result.tempPassword}`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="admin" />}>
      <FormShell title="Onboard New Doctor" message={message} onSubmit={submit}>
        {field('Full Name', 'fullName', form, setForm)}
        {field('WhatsApp Phone', 'phoneNumber', form, setForm)}
        {field('Email', 'email', form, setForm)}
        {field('NMC Reg Number', 'nmcRegNumber', form, setForm)}
        {field('State Medical Council', 'stateMedicalCouncil', form, setForm)}
        {field('Specialization', 'specialization', form, setForm)}
        {field('Practice City', 'city', form, setForm)}
        {field('Consultation Fee', 'consultationFee', form, setForm, 'number')}
      </FormShell>
    </PageShell>
  )
}

export function FormShell({ title, message, onSubmit, children }) {
  return (
    <div className="dashboard">
      <section className="card card--no-hover" style={{ maxWidth: 820 }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-5)' }}>{title}</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>{children}</div>
        <button className="btn btn-primary btn-md" style={{ marginTop: 'var(--space-5)' }} onClick={onSubmit}>Submit for Review</button>
        {message && <p style={{ marginTop: 'var(--space-3)', color: message.includes('queued') ? 'var(--color-safe)' : 'var(--color-severe)' }}>{message}</p>}
      </section>
    </div>
  )
}

export function field(label, key, form, setForm, type = 'text') {
  return (
    <div className="form-group" key={key}>
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </div>
  )
}
