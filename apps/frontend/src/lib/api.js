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

  patch: async (endpoint, data) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await readError(res)) || `PATCH ${endpoint} failed: ${res.status}`)
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
  labOrders: () => api.get('/patient/me/lab-orders'),
  quickView: (patientId) => api.get(`/patient/${patientId}/quick-view`),
  recordPreVisitSymptoms: (data) => api.post('/patient/me/pre-visit-symptoms', data),
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

export const labApi = {
  me: () => api.get('/lab/me'),
  pendingOrders: () => api.get('/lab/orders/pending'),
  order: (orderId) => api.get(`/lab/orders/${orderId}`),
  updateOrderStatus: (orderId, newStatus, note) => api.patch(`/lab/orders/${orderId}/status`, { newStatus, note }),
  uploadOrderReport: (orderId, data) => api.post(`/lab/orders/${orderId}/upload-report`, data),
  uploadReport: (data) => api.post('/lab/upload', data),
  verifyReport: (reportId) => api.get(`/lab-reports/${reportId}/verify`),
}

export const onboardingApi = {
  doctor: (data) => api.post('/onboarding/doctor', data),
  lab: (data) => api.post('/onboarding/lab', data),
  initiatePatient: (phoneNumber) => api.post('/onboarding/patient/initiate', { phoneNumber }),
  completePatient: (data) => api.post('/onboarding/patient/complete', data),
}

export const publicVerifyApi = {
  prescription: async (id) => {
    const res = await fetch(`${API_BASE.replace(/\/api$/, '')}/verify/prescription/${id}`)
    if (!res.ok) throw new Error((await readError(res)) || 'Prescription verification failed')
    return res.json()
  },
  labReport: async (id) => {
    const res = await fetch(`${API_BASE.replace(/\/api$/, '')}/verify/lab-report/${id}`)
    if (!res.ok) throw new Error((await readError(res)) || 'Lab report verification failed')
    return res.json()
  },
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

export const aiApi = {
  drugCheck: (patientId, medication) => doctorApi.interactionCheck(patientId, medication),
}

export default api
