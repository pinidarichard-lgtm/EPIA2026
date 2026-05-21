import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const NAV_GROUPS = [
  {
    label: 'Pédagogie',
    items: [
      { to: '/plans', label: '📋 Plans d\'unité' },
      { to: '/cahier', label: '📒 Cahier de textes' },
    ]
  },
  {
    label: 'Élèves',
    items: [
      { to: '/eleves', label: '👥 Listes élèves' },
      { to: '/absences', label: '📅 Absences' },
      { to: '/notes', label: '🎯 Notes' },
      { to: '/suivi', label: '📈 Suivi individuel' },
    ]
  },
]

export default function Layout({ children }) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: '#1a3a5c', color: '#fff',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '64px',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <img src="/logo-epia.png" alt="Logo EPIA" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 6 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>EPIA Lomé</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: -2 }}>Programme du Diplôme</div>
          </div>
        </Link>

        {/* Nav desktop */}
        <nav style={{ display: 'flex', gap: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
          <NavLink to="/apropos" active={location.pathname === '/apropos'}>À propos</NavLink>

          {NAV_GROUPS.map(group => (
            <NavDropdown key={group.label} label={group.label} items={group.items} location={location} />
          ))}

          <Link to="/plans/new" style={{
            background: '#e8b84b', color: '#1a3a5c', textDecoration: 'none',
            padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700, marginLeft: 6
          }}>+ Nouveau plan</Link>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '1.5rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      <footer style={{
        background: '#1a3a5c', color: 'rgba(255,255,255,0.5)',
        textAlign: 'center', padding: '1rem', fontSize: 13
      }}>
        © 2025 L'E.P.I.A. — École Pilote Innovante Alpha de Lomé, Togo · Programme du Diplôme IB
      </footer>
    </div>
  )
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} style={{
      color: active ? '#e8b84b' : 'rgba(255,255,255,0.82)',
      textDecoration: 'none', fontSize: 13,
      padding: '6px 10px', borderRadius: 6,
      background: active ? 'rgba(232,184,75,0.12)' : 'transparent',
      fontWeight: active ? 700 : 400,
    }}>{children}</Link>
  )
}

function NavDropdown({ label, items, location }) {
  const [open, setOpen] = useState(false)
  const isActive = items.some(i => location.pathname.startsWith(i.to))

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button style={{
        background: isActive ? 'rgba(232,184,75,0.12)' : 'transparent',
        color: isActive ? '#e8b84b' : 'rgba(255,255,255,0.82)',
        border: 'none', cursor: 'pointer',
        fontSize: 13, padding: '6px 10px', borderRadius: 6,
        fontWeight: isActive ? 700 : 400,
        display: 'flex', alignItems: 'center', gap: 4
      }}>
        {label} <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0,
          background: '#fff', borderRadius: 8, padding: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          minWidth: 200, zIndex: 200,
          border: '1px solid #e8e6e0'
        }}>
          {items.map(item => (
            <Link key={item.to} to={item.to} style={{
              display: 'block', padding: '8px 12px', borderRadius: 6,
              textDecoration: 'none', fontSize: 14,
              background: location.pathname.startsWith(item.to) ? '#eef2f7' : 'transparent',
              color: location.pathname.startsWith(item.to) ? '#1a3a5c' : '#333',
              fontWeight: location.pathname.startsWith(item.to) ? 600 : 400,
            }}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
