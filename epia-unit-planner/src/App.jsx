import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Pages publiques
import LoginPage   from './pages/LoginPage'
import AdminLogin  from './pages/AdminLogin'

// Pages admin
import AdminPage   from './pages/AdminPage'
import AdminGuard  from './components/AdminGuard'

// Dashboards
import ProfDashboard  from './pages/ProfDashboard'
import EleveDashboard from './pages/EleveDashboard'

// Pages existantes
import HomePage      from './pages/HomePage'
import NewPlanPage   from './pages/NewPlanPage'
import EditPlanPage  from './pages/EditPlanPage'
import ViewPlanPage  from './pages/ViewPlanPage'
import PlansListPage from './pages/PlansListPage'
import AProposPage   from './pages/AProposPage'
import ElevesPage    from './pages/ElevesPage'
import AppelPage     from './pages/AppelPage'
import CahierPage    from './pages/CahierPage'

// Guard
import AuthGuard from './components/AuthGuard'

export default function App() {
  return (
    <Routes>
      {/* ── Publiques ── */}
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* ── Admin ── */}
      <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />

      {/* ── Prof dashboard ── */}
      <Route path="/prof/dashboard" element={<AuthGuard><ProfDashboard /></AuthGuard>} />

      {/* ── Élève dashboard ── */}
      <Route path="/eleve/dashboard" element={<AuthGuard><EleveDashboard /></AuthGuard>} />

      {/* ── Pages protégées avec Layout ── */}
      <Route path="/*" element={
        <AuthGuard>
          <Layout>
            <Routes>
              <Route path="/"               element={<HomePage />} />
              <Route path="/apropos"        element={<AProposPage />} />
              <Route path="/plans"          element={<PlansListPage />} />
              <Route path="/plans/new"      element={<NewPlanPage />} />
              <Route path="/plans/:id"      element={<ViewPlanPage />} />
              <Route path="/plans/:id/edit" element={<EditPlanPage />} />
              <Route path="/eleves"         element={<ElevesPage />} />
              <Route path="/appel"          element={<AppelPage />} />
              <Route path="/cahier"         element={<CahierPage />} />
            </Routes>
          </Layout>
        </AuthGuard>
      } />
    </Routes>
  )
}
