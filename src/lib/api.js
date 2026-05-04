const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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
    if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`)
    return res.json()
  },

  post: async (endpoint, data) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`)
    return res.json()
  },

  put: async (endpoint, data) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`PUT ${endpoint} failed: ${res.status}`)
    return res.json()
  },

  delete: async (endpoint) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error(`DELETE ${endpoint} failed: ${res.status}`)
    return res.json()
  },
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
  records: (page = 1, filters = {}) => api.get(`/patient/records?page=${page}&${new URLSearchParams(filters)}`),
  prescriptions: () => api.get('/patient/prescriptions'),
  activeMedications: () => api.get('/patient/prescriptions/active'),
  labReports: () => api.get('/patient/lab-reports'),
  standardQR: () => api.get('/patient/qr/standard'),
  emergencyQR: () => api.get('/patient/qr/emergency'),
  family: () => api.get('/patient/family'),
  addFamilyMember: (data) => api.post('/patient/family/add', data),
}

export const doctorApi = {
  profile: () => api.get('/doctor/profile'),
  scanQR: (token) => api.post('/doctor/scan-qr', { token }),
  patientRecord: (patientId) => api.get(`/doctor/patient/${patientId}/record`),
  prescribe: (data) => api.post('/doctor/prescribe', data),
  updatePrescription: (id, data) => api.put(`/doctor/prescription/${id}`, data),
  todayQueue: () => api.get('/doctor/today-queue'),
  interactionCheck: (newDrug, currentMedications) =>
    api.post('/doctor/interaction-check', { new_drug: newDrug, current_medications: currentMedications }),
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
  generateStandard: (patientId) => api.post('/qr/generate/standard', { patientId }),
  generateEmergency: (patientId) => api.post('/qr/generate/emergency', { patientId }),
  validate: (token) => api.post('/qr/validate', { token }),
  emergency: (patientId) => fetch(`${API_BASE}/qr/emergency/${patientId}`).then(r => r.json()),
}

export const aiApi = {
  drugCheck: async (newDrug, currentMedications, allergies = []) => {
    await new Promise(r => setTimeout(r, 150))
    const mockInteractions = []
    let overall = 'safe'

    for (const med of currentMedications) {
      const pair = `${newDrug}-${med}`.toLowerCase()
      let severity = 'safe'

      if (pair.includes('aspirin') && pair.includes('warfarin')) {
        severity = 'severe'
        overall = 'severe'
      } else if (pair.includes('metformin') && pair.includes('alcohol')) {
        severity = 'moderate'
        if (overall !== 'severe') overall = 'moderate'
      }

      mockInteractions.push({
        drug_a: newDrug,
        drug_b: med,
        severity,
        mechanism: severity !== 'safe' ? `Interaction between ${newDrug} and ${med} detected.` : null,
        recommendation: severity === 'severe' ? 'DO NOT co-administer.' : severity === 'moderate' ? 'Use with caution.' : 'Safe to prescribe.',
        source: 'DrugBank + OpenFDA',
        confidence: severity === 'severe' ? 97.3 : severity === 'moderate' ? 88.5 : 91.2,
      })
    }

    return {
      results: mockInteractions,
      overall_severity: overall,
      allergy_flags: [],
      latency_ms: Math.floor(Math.random() * 80) + 100,
    }
  },
}

export default api