import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react'
import { publicVerifyApi } from '../../lib/api.js'
import '../patient/Dashboard.css'

export default function VerifyPrescription() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    publicVerifyApi.prescription(id).then(setData).catch((err) => setError(err.message))
  }, [id])

  return <VerifyShell title="Prescription Verification" data={data} error={error} />
}

export function VerifyShell({ title, data, error }) {
  const ok = data?.valid && !data?.blockchain?.tampered
  return (
    <main className="dashboard" style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-8)' }}>
      <section className="card card--no-hover" style={{ borderLeft: `6px solid ${ok ? 'var(--color-safe)' : 'var(--color-severe)'}` }}>
        {error && <p style={{ color: 'var(--color-severe)' }}>{error}</p>}
        {!data && !error && <p>Loading verification...</p>}
        {data && (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              {ok ? <CheckCircle2 color="var(--color-safe)" size={32} /> : <AlertCircle color="var(--color-severe)" size={32} />}
              <div><h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>{ok ? `Verified ${title}` : 'Verification Failed'}</h1><p style={{ color: 'var(--color-gray-500)' }}>{data.prescriptionNumber || data.reportNumber || data.reason}</p></div>
            </div>
            {data.doctor && <p><strong>Issued by:</strong> {data.doctor.name} {data.doctor.verified && <ShieldCheck size={16} color="var(--color-safe)" />}</p>}
            {data.lab && <p><strong>Issued by:</strong> {data.lab.name} {data.lab.verified && <ShieldCheck size={16} color="var(--color-safe)" />}</p>}
            {data.patientNameAndAge && <p><strong>For:</strong> {data.patientNameAndAge}</p>}
            {data.medications?.map((med, index) => <p key={index} style={{ fontFamily: 'var(--font-mono)' }}>{med.drug} {med.strength} - {med.dosage}</p>)}
            {data.results?.map((result, index) => <p key={index} style={{ fontFamily: 'var(--font-mono)' }}>{result.testName}: {result.value} {result.unit} {result.flag ? `(${result.flag})` : ''}</p>)}
            {data.blockchain?.txHash && <a href={data.blockchain.explorerUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-4)' }}>View blockchain proof <ExternalLink size={14} /></a>}
          </>
        )}
      </section>
    </main>
  )
}
