import { NavLink, Link } from 'react-router-dom'
import { Shield, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../stores/index.js'
import './Sidebar.css'

export default function Sidebar({ items, role }) {
  const [collapsed, setCollapsed] = useState(false)
  const logout = useAuthStore((state) => state.logout)

  const roleColors = {
    patient: 'var(--color-primary-500)',
    doctor: 'var(--color-primary-800)',
    lab: 'var(--color-secondary-600)',
    admin: 'var(--color-gray-900)',
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      style={{ '--sidebar-accent': roleColors[role] || roleColors.patient }}
    >
      <div className="sidebar__header">
        <Link to="/" className="sidebar__logo">
            <img src="/logo-removebg-preview.png" alt="MedVault Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          {!collapsed && <span className="sidebar__logo-text">MedVault</span>}
        </Link>
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar__item-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar__item-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <Link to="/login" className="sidebar__item" title="Log out" onClick={logout}>
          <span className="sidebar__item-icon"><LogOut size={20} /></span>
          {!collapsed && <span className="sidebar__item-label">Log Out</span>}
        </Link>
      </div>
    </aside>
  )
}
