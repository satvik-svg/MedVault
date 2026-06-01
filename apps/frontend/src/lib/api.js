const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const getHeaders = () => {
  const token = localStorage.getItem('medvault_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error((await readError(res)) || `GET ${endpoint} failed: ${res.status}`)
    return res.json()
  },

  post: async (endpoint, data) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await readError(res)) || `POST ${endpoint} failed: ${res.status}`)
    return res.json()
  },

  put: async (endpoint, data) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await readError(res)) || `PUT ${endpoint} failed: ${res.status}`)
    return res.json()
  },

  delete: async (endpoint) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error((await readError(res)) || `DELETE ${endpoint} failed: ${res.status}`)
    return res.json()
  },
}

const readError = async (res) => {
  try {
    const payload = await res.json()
    return payload.error
  } catch {
    return null
  }
}

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout', {}),
  me: () => api.get('/auth/me'),
}

export const patientApi = {
  profile: () => api.get('/patient/profile'),
  updateProfile: (data) => api.put('/patient/profile', data),
  records: (_page = 1, filters = {}) => api.get(`/patient/timeline?${new URLSearchParams(filters)}`),
  summary: () => api.get('/patient/summary'),
  prescriptions: () => api.get('/patient/prescriptions'),
  activeMedications: () => api.get('/patient/prescriptions/active'),
  labReports: () => api.get('/patient/lab-reports'),
  emergencyQR: () => api.get('/patient/qr/emergency'),
}

export const doctorApi = {
  profile: () => api.get('/doctor/me'),
  scanQR: (token) => api.post('/doctor/scan-qr', { token }),
  patientRecord: (patientId) => api.get(`/doctor/patient/${patientId}/record`),
  prescribe: (data) => api.post('/doctor/prescribe', data),
  todayQueue: () => api.get('/doctor/today-queue'),
  interactionCheck: (patientId, medication) =>
    api.post('/prescriptions/check-medication', { patientId, medication }),
  searchDrugs: (query) => api.get(`/prescriptions/drugs/search?q=${encodeURIComponent(query)}`),
  patients: () => api.get('/doctor/patients'),
}

export const recordsApi = {
  upload: (formData) =>
    fetch(`${API_BASE}/records/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('medvault_token')}` },
      body: formData,
    }),
  ocr: (recordId) => api.post(`/records/${recordId}/ocr`, {}),
  verify: (recordId) => api.get(`/records/${recordId}/verify`),
  delete: (recordId) => api.delete(`/records/${recordId}`),
}

export const qrApi = {
  generateEmergency: () => api.post('/emergency-qr/generate', {}),
  activeEmergency: () => api.get('/emergency-qr/active'),
  scanEmergency: (signedPayload, scannerLocation, facilityName) =>
    api.post('/emergency-qr/scan', { signedPayload, scannerLocation, facilityName }),
  revokeEmergency: (nonce, reason) => api.post(`/emergency-qr/revoke/${nonce}`, { reason }),
}

export const aiApi = {
  drugCheck: (patientId, medication) => doctorApi.interactionCheck(patientId, medication),
}

export const pharmacyApi = {
  scanPrescription: (qrData) => api.post('/pharmacy/scan-prescription', { qrData }),
  dispense: (prescriptionId, data) => api.post(`/pharmacy/dispense/${prescriptionId}`, data),
}

export default api
