import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

import LoginPage            from './pages/LoginPage'
import AdminLogin           from './pages/AdminLogin'
import AdminPage            from './pages/AdminPage'
import AdminDashboard       from './pages/AdminDashboard'
import AdminMatieresIB      from './pages/AdminMatieresIB'
import AdminMatieresEcole   from './pages/AdminMatieresEcole'
import AdminAnneesScolaires from './pages/AdminAnneesScolaires'
import AdminEleveMatieres   from './pages/AdminEleveMatieres'
import AdminProfMatieres    from './pages/AdminProfMatieres'
import AdminGuard           from './components/AdminGuard'
import ProfDashboard        from './pages/ProfDashboard'
import ProfNotes            from './pages/ProfNotes'
import ProfAbsences         from './pages/ProfAbsences'
import EleveAbsences        from './pages/EleveAbsences'
import EleveDashboard       from './pages/EleveDashboard'
import EleveNotes           from './pages/EleveNotes'
import Bulletin             from './pages/Bulletin'
import BulletinEdit         from './pages/BulletinEdit'
import HomePage             from './pages/HomePage'
import NewPlanPage          from './pages/NewPlanPage'
import EditPlanPage         from './pages/EditPlanPage'
import ViewPlanPage         from './pages/ViewPlanPage'
import PlansListPage        from './pages/PlansListPage'
import AProposPage          from './pages/AProposPage'
import ElevesPage           from './pages/ElevesPage'
import AppelPage            from './pages/AppelPage'
import CahierPage           from './pages/CahierPage'
import AuthGuard            from './components/AuthGuard'

export default function App() {
  return (
    <Routes>
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route path="/admin"                        element={<AdminGuard><AdminPage /></AdminGuard>} />
      <Route path="/admin/dashboard"              element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="/admin/matieres-ib"            element={<AdminGuard><AdminMatieresIB /></AdminGuard>} />
      <Route path="/admin/matieres-ecole"         element={<AdminGuard><AdminMatieresEcole /></AdminGuard>} />
      <Route path="/admin/annees-scolaires"       element={<AdminGuard><AdminAnneesScolaires /></AdminGuard>} />
      <Route path="/admin/eleve-matieres"         element={<AdminGuard><AdminEleveMatieres /></AdminGuard>} />
      <Route path="/admin/prof-matieres"          element={<AdminGuard><AdminProfMatieres /></AdminGuard>} />
      <Route path="/admin/bulletin/:eleveId"      element={<AdminGuard><Bulletin /></AdminGuard>} />
      <Route path="/admin/bulletin-edit/:eleveId" element={<AdminGuard><BulletinEdit /></AdminGuard>} />

      <Route path="/prof/dashboard"               element={<AuthGuard><ProfDashboard /></AuthGuard>} />
      <Route path="/prof/notes"                   element={<AuthGuard><ProfNotes /></AuthGuard>} />
      <Route path="/prof/absences"               element={<AuthGuard><ProfAbsences /></AuthGuard>} />
      <Route path="/prof/bulletin/:eleveId"       element={<AuthGuard><Bulletin /></AuthGuard>} />

      <Route path="/eleve/dashboard"              element={<AuthGuard><EleveDashboard /></AuthGuard>} />
      <Route path="/eleve/notes"                  element={<AuthGuard><EleveNotes /></AuthGuard>} />
      <Route path="/eleve/absences"              element={<AuthGuard><EleveAbsences /></AuthGuard>} />
      <Route path="/eleve/bulletin"               element={<AuthGuard><Bulletin /></AuthGuard>} />

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
