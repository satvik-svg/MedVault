import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,

  login: (user, token, role) => set({
    user,
    token,
    role,
    isAuthenticated: true,
  }),

  logout: () => set({
    user: null,
    token: null,
    role: null,
    isAuthenticated: false,
  }),

  setUser: (user) => set({ user }),

  setRole: (role) => set({ role }),
}))

export const usePatientStore = create((set) => ({
  profile: null,
  records: [],
  activeMedications: [],
  prescriptions: [],
  labReports: [],
  familyMembers: [],

  setProfile: (profile) => set({ profile }),
  setRecords: (records) => set({ records }),
  setActiveMedications: (meds) => set({ activeMedications: meds }),
  setPrescriptions: (prescriptions) => set({ prescriptions }),
  setLabReports: (reports) => set({ labReports: reports }),
  setFamilyMembers: (members) => set({ familyMembers: members }),

  addRecord: (record) => set((state) => ({
    records: [record, ...state.records]
  })),

  updateProfile: (updates) => set((state) => ({
    profile: { ...state.profile, ...updates }
  })),
}))

export const usePrescriptionStore = create((set) => ({
  currentPrescription: null,
  interactionCheck: null,
  prescribedDrugs: [],
  patientContext: null,

  setPatientContext: (patient) => set({ patientContext: patient }),
  setInteractionCheck: (check) => set({ interactionCheck: check }),
  setPrescribedDrugs: (drugs) => set({ prescribedDrugs: drugs }),

  addDrug: (drug) => set((state) => ({
    prescribedDrugs: [...state.prescribedDrugs, drug]
  })),

  removeDrug: (index) => set((state) => ({
    prescribedDrugs: state.prescribedDrugs.filter((_, i) => i !== index)
  })),

  clearPrescription: () => set({
    currentPrescription: null,
    interactionCheck: null,
    prescribedDrugs: [],
    patientContext: null,
  }),
}))

export const useDoctorStore = create((set) => ({
  todayQueue: [],
  recentInteractions: [],
  patientRecord: null,
  searchResults: [],

  setTodayQueue: (queue) => set({ todayQueue: queue }),
  setRecentInteractions: (interactions) => set({ recentInteractions: interactions }),
  setPatientRecord: (record) => set({ patientRecord: record }),
  setSearchResults: (results) => set({ searchResults: results }),

  addToQueue: (patient) => set((state) => ({
    todayQueue: [...state.todayQueue, patient]
  })),

  removeFromQueue: (patientId) => set((state) => ({
    todayQueue: state.todayQueue.filter(p => p.id !== patientId)
  })),
}))