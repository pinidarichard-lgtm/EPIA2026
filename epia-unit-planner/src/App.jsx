import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Pages publiques (sans connexion)
import LoginPage from './pages/LoginPage'

// Pages protégées (connexion requise)
import HomePage from './pages/HomePage'
import NewPlanPage from './pages/NewPlanPage'
import EditPlanPage from './pages/EditPlanPage'
import ViewPlanPage from './pages/ViewPlanPage'
import PlansListPage from './pages/PlansListPage'
import AProposPage from './pages/AProposPage'
import ElevesPage from './pages/ElevesPage'
import AppelPage from './pages/AppelPage'
import CahierPage from './pages/CahierPage'

// Pages admin
import AdminLogin from './pages/AdminLogin'
import AdminPage from './pages/AdminPage'

// Guards
import AuthGuard from './components/AuthGuard'
import AdminGuard from './components/AdminGuard'

export default function App() {
  return (
    <Routes>
      {/* ── Page de connexion (publique) ── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Page admin login (publique) ── */}
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* ── Panel admin (protégé admin) ── */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminPage />
          </AdminGuard>
        }
      />

      {/* ── Toutes les autres pages (connexion requise) ── */}
      <Route
        path="/*"
        element={
          <AuthGuard>
            <Layout>
              <Routes>
                <Route path="/"              element={<HomePage />} />
                <Route path="/apropos"       element={<AProposPage />} />
                <Route path="/plans"         element={<PlansListPage />} />
                <Route path="/plans/new"     element={<NewPlanPage />} />
                <Route path="/plans/:id"     element={<ViewPlanPage />} />
                <Route path="/plans/:id/edit" element={<EditPlanPage />} />
                <Route path="/eleves"        element={<ElevesPage />} />
                <Route path="/appel"         element={<AppelPage />} />
                <Route path="/cahier"        element={<CahierPage />} />
              </Routes>
            </Layout>
          </AuthGuard>
        }
      />
    </Routes>
  )
}
