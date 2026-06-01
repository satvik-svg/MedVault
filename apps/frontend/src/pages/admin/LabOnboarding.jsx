import { useState } from 'react'
import { Home, Stethoscope, UserPlus } from 'lucide-react'
import PageShell from '../../components/layout/PageShell.jsx'
import Sidebar from '../../components/layout/Sidebar.jsx'
import { onboardingApi } from '../../lib/api.js'
import { field, FormShell } from './DoctorOnboarding.jsx'
import '../patient/Dashboard.css'

const sidebarItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { path: '/admin/onboarding/doctor/new', label: 'New Doctor', icon: <Stethoscope size={20} /> },
  { path: '/admin/onboarding/lab/new', label: 'New Lab', icon: <UserPlus size={20} /> },
]

export default function LabOnboarding() {
  const [form, setForm] = useState({ legalName: '', displayName: '', phone: '', email: '', gstin: '', nablAccreditationNumber: '', city: '', operatorEmail: '', operatorPhone: '' })
  const [message, setMessage] = useState('')

  const submit = async () => {
    try {
      await onboardingApi.lab({
        ...form,
        address: { city: form.city },
        operators: [{ email: form.operatorEmail, phoneNumber: form.operatorPhone }],
        testsOffered: [
          { loincCode: '4548-4', displayName: 'HbA1c', price: 450, turnaroundHours: 24 },
          { loincCode: '1558-6', displayName: 'Fasting Blood Sugar', price: 120, turnaroundHours: 8 },
        ],
      })
      setMessage('Lab created and queued for review.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <PageShell sidebar={<Sidebar items={sidebarItems} role="admin" />}>
      <FormShell title="Onboard New Lab" message={message} onSubmit={submit}>
        {field('Legal Name', 'legalName', form, setForm)}
        {field('Display Name', 'displayName', form, setForm)}
        {field('Phone', 'phone', form, setForm)}
        {field('Email', 'email', form, setForm)}
        {field('GSTIN', 'gstin', form, setForm)}
        {field('NABL Number', 'nablAccreditationNumber', form, setForm)}
        {field('City', 'city', form, setForm)}
        {field('Operator Email', 'operatorEmail', form, setForm)}
        {field('Operator Phone', 'operatorPhone', form, setForm)}
      </FormShell>
    </PageShell>
  )
}
