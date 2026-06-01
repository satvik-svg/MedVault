import { AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react'

export default function BlockchainBadge({ record }) {
  const blockchain = record?.blockchain || {}
  const txHash = blockchain.txHash || record?.blockchainTxHash
  const status = blockchain.status || (txHash ? 'ANCHORED' : 'NOT_QUEUED')
  const tampered = blockchain.tampered || record?.tampered

  if (tampered) {
    return <span className="badge badge-severe"><AlertTriangle size={12} /> Tampered</span>
  }

  if (status === 'ANCHORED' || txHash) {
    return <span className="badge badge-gold"><Shield size={12} /> {shortHash(blockchain.contentHash || txHash)}</span>
  }

  if (status === 'QUEUED' || status === 'PENDING') {
    return <span className="badge badge-moderate"><Clock size={12} /> Pending</span>
  }

  return <span className="badge badge-safe"><CheckCircle size={12} /> Not anchored</span>
}

function shortHash(value) {
  if (!value) return 'Anchored'
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}
