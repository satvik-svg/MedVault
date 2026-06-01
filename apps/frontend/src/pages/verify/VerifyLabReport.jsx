import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicVerifyApi } from '../../lib/api.js'
import { VerifyShell } from './VerifyPrescription.jsx'

export default function VerifyLabReport() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    publicVerifyApi.labReport(id).then(setData).catch((err) => setError(err.message))
  }, [id])

  return <VerifyShell title="Lab Report" data={data} error={error} />
}
