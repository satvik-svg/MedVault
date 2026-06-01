import { useEffect, useState } from 'react'
import { FlaskConical, MapPin, Star } from 'lucide-react'
import { api } from '../../lib/api.js'

export default function LabPicker({ loincCodes = [], city = '', onSelect, onSkip }) {
  const [openNow, setOpenNow] = useState(true)
  const [labs, setLabs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const query = new URLSearchParams({
      city: city || 'UNKNOWN',
      loincCodes: loincCodes.join(','),
      openNow: String(openNow),
    })
    api.get(`/lab/discover?${query}`)
      .then(setLabs)
      .catch((err) => setError(err.message))
  }, [city, loincCodes.join(','), openNow])

  return (
    <div className="card card--no-hover">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 className="dashboard__section-title" style={{ margin: 0 }}><FlaskConical size={18} /> Choose Lab</h3>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} />
          Open now
        </label>
      </div>
      {error && <p style={{ color: 'var(--color-severe)', fontSize: 'var(--text-sm)' }}>{error}</p>}
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {labs.map((lab) => (
          <button key={lab.labId || lab._id} className="card" style={{ textAlign: 'left', padding: 'var(--space-4)' }} onClick={() => onSelect?.(lab.labId || lab._id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <div>
                <strong>{lab.displayName}</strong>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginTop: 4 }}>
                  <MapPin size={12} /> {lab.address?.city || city || 'City'} {lab.distance ? `· ${lab.distance.toFixed(1)} km` : ''}
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {lab.isFavoriteOfDoctor && <span className="badge badge-gold"><Star size={12} /> Favorite</span>}
                  {lab.trustSignals?.nablAccredited && <span className="badge badge-safe">NABL</span>}
                  {lab.homeCollection?.available && <span className="badge badge-teal">Home collection</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 'var(--text-sm)' }}>
                <strong>Rs {lab.pricing?.totalEstimatedPrice || 'TBD'}</strong>
                <span style={{ display: 'block', color: 'var(--color-gray-500)' }}>TAT {lab.turnaroundTime?.maxHours || 24}h</span>
              </div>
            </div>
          </button>
        ))}
        {!labs.length && !error && <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>No matching labs found.</p>}
      </div>
      <button className="btn btn-ghost btn-md" style={{ marginTop: 'var(--space-4)' }} onClick={onSkip}>Let patient choose alternate lab</button>
    </div>
  )
}
