import { Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { RequireRole } from './routes/guards'
import AboutPage from './pages/public/AboutPage'
import ContactPage from './pages/public/ContactPage'
import CoursesPage from './pages/public/CoursesPage'
import FaqPage from './pages/public/FaqPage'
import HomePage from './pages/public/HomePage'
import LegalPage from './pages/public/LegalPage'
import MentorDetailPage from './pages/public/MentorDetailPage'
import MentorsPage from './pages/public/MentorsPage'
import NotFoundPage from './pages/public/NotFoundPage'
import ScholarshipDetailPage from './pages/public/ScholarshipDetailPage'
import ScholarshipsPage from './pages/public/ScholarshipsPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import StudentAccountPage from './pages/student/StudentAccountPage'
import StudentApplicationsPage from './pages/student/StudentApplicationsPage'
import StudentDashboardPage from './pages/student/StudentDashboardPage'
import StudentProfilePage from './pages/student/StudentProfilePage'
import StudentSavedPage from './pages/student/StudentSavedPage'
import MentorAvailabilityPage from './pages/mentor/MentorAvailabilityPage'
import MentorDashboardPage from './pages/mentor/MentorDashboardPage'
import MentorProfilePage from './pages/mentor/MentorProfilePage'
import MentorServiceEditPage from './pages/mentor/MentorServiceEditPage'
import AdminAuditPage from './pages/admin/AdminAuditPage'
import AdminIntegrationsPage from './pages/admin/AdminIntegrationsPage'
import AdminMentorApprovalsPage from './pages/admin/AdminMentorApprovalsPage'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminScholarshipsPage from './pages/admin/AdminScholarshipsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="bolsas" element={<ScholarshipsPage />} />
        <Route path="bolsas/:slug" element={<ScholarshipDetailPage />} />
        <Route path="mentores" element={<MentorsPage />} />
        <Route path="mentores/:slug" element={<MentorDetailPage />} />
        <Route path="cursos-e-mentorias" element={<CoursesPage />} />
        <Route path="sobre-nos" element={<AboutPage />} />
        <Route path="contactos" element={<ContactPage />} />
        <Route path="perguntas-frequentes" element={<FaqPage />} />
        <Route path="fontes-e-verificacao" element={<LegalPage kind="fontes" />} />
        <Route path="privacidade" element={<LegalPage kind="privacidade" />} />
        <Route path="termos" element={<LegalPage kind="termos" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Autenticação: sem rodapé, como no desenho */}
      <Route element={<PublicLayout bare />}>
        <Route path="entrar" element={<LoginPage />} />
        <Route path="registo" element={<RegisterPage />} />
        <Route path="recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="nova-senha" element={<ResetPasswordPage />} />
      </Route>

      {/* A autorização real é feita pelo backend; estas guardas são só de navegação. */}
      <Route element={<RequireRole role="estudante" />}>
        <Route path="estudante" element={<DashboardLayout area="estudante" />}>
          <Route index element={<StudentDashboardPage />} />
          <Route path="perfil" element={<StudentProfilePage />} />
          <Route path="guardadas" element={<StudentSavedPage />} />
          <Route path="candidaturas" element={<StudentApplicationsPage />} />
          <Route path="conta" element={<StudentAccountPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="mentor" />}>
        <Route path="mentor" element={<DashboardLayout area="mentor" />}>
          <Route index element={<MentorDashboardPage />} />
          <Route path="perfil" element={<MentorProfilePage />} />
          <Route path="servicos/novo" element={<MentorServiceEditPage />} />
          <Route path="servicos/:id" element={<MentorServiceEditPage />} />
          <Route path="disponibilidade" element={<MentorAvailabilityPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route path="admin" element={<DashboardLayout area="admin" />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="utilizadores" element={<AdminUsersPage />} />
          <Route path="mentores" element={<AdminMentorApprovalsPage />} />
          <Route path="bolsas" element={<AdminScholarshipsPage />} />
          <Route path="denuncias" element={<AdminReportsPage />} />
          <Route path="integracoes" element={<AdminIntegrationsPage />} />
          <Route path="auditoria" element={<AdminAuditPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
