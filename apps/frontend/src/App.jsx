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
import PatientQuickView from './pages/doctor/PatientQuickView.jsx'
import OrderTests from './pages/doctor/OrderTests.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import DoctorOnboarding from './pages/admin/DoctorOnboarding.jsx'
import LabOnboarding from './pages/admin/LabOnboarding.jsx'
import LabDashboard from './pages/lab/LabDashboard.jsx'
import LabOrders from './pages/lab/LabOrders.jsx'
import LabOrderDetail from './pages/lab/LabOrderDetail.jsx'
import LabUploadReport from './pages/lab/LabUploadReport.jsx'
import VerifyPrescription from './pages/verify/VerifyPrescription.jsx'
import VerifyLabReport from './pages/verify/VerifyLabReport.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'

const protect = (allowedRoles, element) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
)

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
          <Route path="/patient/dashboard" element={protect(['PATIENT'], <PatientDashboard />)} />
          <Route path="/patient/records" element={protect(['PATIENT'], <MedicalRecord />)} />
          <Route path="/patient/prescriptions" element={protect(['PATIENT'], <PatientPrescriptions />)} />
          <Route path="/patient/qr" element={protect(['PATIENT'], <QRPage />)} />
          <Route path="/doctor/dashboard" element={protect(['DOCTOR'], <DoctorPortal />)} />
          <Route path="/doctor/prescribe/:patientId" element={protect(['DOCTOR'], <PrescriptionWriter />)} />
          <Route path="/doctor/prescribe" element={protect(['DOCTOR'], <PrescriptionWriter />)} />
          <Route path="/doctor/scan" element={protect(['DOCTOR'], <QRScanner />)} />
          <Route path="/doctor/drug-checker" element={protect(['DOCTOR'], <DrugChecker />)} />
          <Route path="/doctor/patient/:patientId" element={protect(['DOCTOR'], <PatientQuickView />)} />
          <Route path="/doctor/order-tests/:patientId" element={protect(['DOCTOR'], <OrderTests />)} />
          <Route path="/admin/dashboard" element={protect(['PLATFORM_ADMIN'], <AdminDashboard />)} />
          <Route path="/admin/onboarding/doctor/new" element={protect(['PLATFORM_ADMIN'], <DoctorOnboarding />)} />
          <Route path="/admin/onboarding/lab/new" element={protect(['PLATFORM_ADMIN'], <LabOnboarding />)} />
          <Route path="/lab/dashboard" element={protect(['LAB_OPERATOR'], <LabDashboard />)} />
          <Route path="/lab/orders" element={protect(['LAB_OPERATOR'], <LabOrders />)} />
          <Route path="/lab/orders/:orderId" element={protect(['LAB_OPERATOR'], <LabOrderDetail />)} />
          <Route path="/lab/upload-report" element={protect(['LAB_OPERATOR'], <LabUploadReport />)} />
          <Route path="/verify/prescription/:id" element={<VerifyPrescription />} />
          <Route path="/verify/lab-report/:id" element={<VerifyLabReport />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default App
