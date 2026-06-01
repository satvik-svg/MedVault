import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { onboardingApi } from '../../lib/api.js'

export default function QuickRegisterPatient({ onComplete }) {
  const [step, setStep] = useState('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [profile, setProfile] = useState({ fullName: '', sex: 'O', dateOfBirth: '' })
  const [message, setMessage] = useState('')

  const sendOtp = async () => {
    try {
      const result = await onboardingApi.initiatePatient(phoneNumber)
      if (result.alreadyRegistered) {
        setMessage(`Already registered: ${result.patientId}`)
        onComplete?.(result)
        return
      }
      setStep('otp')
      setMessage('OTP sent on WhatsApp. हिंदी: OTP मरीज के WhatsApp पर भेजा गया है.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  const complete = async () => {
    try {
      const result = await onboardingApi.completePatient({ phoneNumber, otp, ...profile })
      setMessage(`Patient registered: ${result.medvaultId}`)
      onComplete?.(result.patient || result)
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="card card--no-hover">
      <h3 className="dashboard__section-title"><UserPlus size={18} /> Quick Register Patient</h3>
      {step === 'phone' && (
        <div className="form-group">
          <label className="form-label">Patient WhatsApp Phone</label>
          <input className="form-input" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+91 98765 43210" />
          <button className="btn btn-primary btn-md" style={{ marginTop: 'var(--space-3)' }} onClick={sendOtp}>Send OTP</button>
        </div>
      )}
      {step === 'otp' && (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <div className="form-group"><label className="form-label">OTP</label><input className="form-input" value={otp} onChange={(event) => setOtp(event.target.value)} /></div>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group"><label className="form-label">Sex</label><select className="form-select" value={profile.sex} onChange={(event) => setProfile({ ...profile, sex: event.target.value })}><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div>
            <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={profile.dateOfBirth} onChange={(event) => setProfile({ ...profile, dateOfBirth: event.target.value })} /></div>
          </div>
          <button className="btn btn-primary btn-md" onClick={complete}>Complete Registration</button>
        </div>
      )}
      {message && <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: message.includes('registered') || message.includes('sent') ? 'var(--color-safe)' : 'var(--color-severe)' }}>{message}</p>}
    </div>
  )
}
