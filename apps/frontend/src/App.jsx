import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import Landing from './pages/Landing.jsx'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import ABHAVerify from './pages/auth/ABHAVerify.jsx'
import PatientDashboard from './pages/patient/PatientDashboard.jsx'
import MedicalRecord from './pages/patient/MedicalRecord.jsx'
import PatientPrescriptions from './pages/patient/PatientPrescriptions.jsx'
import QRPage from './pages/patient/QRPage.jsx'
import DoctorPortal from './pages/doctor/DoctorPortal.jsx'
import PrescriptionWriter from './pages/doctor/PrescriptionWriter.jsx'
import QRScanner from './pages/doctor/QRScanner.jsx'
import DrugChecker from './pages/doctor/DrugChecker.jsx'
import PharmacyGate from './pages/pharmacy/PharmacyGate.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import ClinicDashboard from './pages/clinic/ClinicDashboard.jsx'

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#1e293b',
            color: '#fff',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          },
        }}
      />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/abha-verify" element={<ABHAVerify />} />
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/records" element={<MedicalRecord />} />
          <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
          <Route path="/patient/qr" element={<QRPage />} />
          <Route path="/doctor/dashboard" element={<DoctorPortal />} />
          <Route path="/doctor/prescribe/:patientId" element={<PrescriptionWriter />} />
          <Route path="/doctor/prescribe" element={<PrescriptionWriter />} />
          <Route path="/doctor/scan" element={<QRScanner />} />
          <Route path="/doctor/drug-checker" element={<DrugChecker />} />
          <Route path="/pharmacy/scan" element={<PharmacyGate />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/clinic/dashboard" element={<ClinicDashboard />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default App
