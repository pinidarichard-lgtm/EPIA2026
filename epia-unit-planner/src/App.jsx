import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import NewPlanPage from './pages/NewPlanPage'
import EditPlanPage from './pages/EditPlanPage'
import ViewPlanPage from './pages/ViewPlanPage'
import PlansListPage from './pages/PlansListPage'
import AProposPage from './pages/AProposPage'
import ElevesPage from './pages/ElevesPage'
import AppelPage from './pages/AppelPage'
import CahierPage from './pages/CahierPage'

// ── Pages admin (nouvelles) ──
import AdminLogin from './pages/AdminLogin'
import AdminPage from './pages/AdminPage'
import AdminGuard from './components/AdminGuard'

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* ── Routes existantes ── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/apropos" element={<AProposPage />} />
        <Route path="/plans" element={<PlansListPage />} />
        <Route path="/plans/new" element={<NewPlanPage />} />
        <Route path="/plans/:id" element={<ViewPlanPage />} />
        <Route path="/plans/:id/edit" element={<EditPlanPage />} />
        <Route path="/eleves" element={<ElevesPage />} />
        <Route path="/appel" element={<AppelPage />} />
        <Route path="/cahier" element={<CahierPage />} />

        {/* ── Routes admin (nouvelles) ── */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          }
        />
      </Routes>
    </Layout>
  )
}
