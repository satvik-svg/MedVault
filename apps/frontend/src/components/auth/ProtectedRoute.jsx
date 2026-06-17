import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/index.js'

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={dashboardForRole(role)} replace />
  }

  return children
}

function dashboardForRole(role) {
  const routes = {
    PATIENT: '/patient/dashboard',
    DOCTOR: '/doctor/dashboard',
    LAB_OPERATOR: '/lab/dashboard',
    PLATFORM_ADMIN: '/admin/dashboard',
  }
  return routes[role] || '/login'
}
