import { Route, Routes } from 'react-router-dom'
import { PublicLayout } from '../layouts/PublicLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'
import HomePage from '../pages/public/HomePage'
import ScholarshipsPage from '../pages/public/ScholarshipsPage'
import ScholarshipDetailPage from '../pages/public/ScholarshipDetailPage'
import MentorsPage from '../pages/public/MentorsPage'
import MentorDetailPage from '../pages/public/MentorDetailPage'
import CoursesPage from '../pages/public/CoursesPage'
import ServiceDetailPage from '../pages/public/ServiceDetailPage'
import { AboutPage, ContactPage, FaqPage, NotFoundPage } from '../pages/public/StaticPages'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '../pages/auth/AuthPages'
import { StudentApplicationsPage, StudentFavoritesPage, StudentHome, StudentProfilePage } from '../pages/student/StudentPages'
import { MentorProfilePage, MentorServicesPage } from '../pages/mentor/MentorPages'
import {
  AdminAuditPage, AdminIntegrationsPage, AdminMentorsPage, AdminReportedPage,
  AdminReportsPage, AdminScholarshipsPage, AdminUsersPage,
} from '../pages/admin/AdminPages'

const studentNav = [
  { to: '/estudante', label: 'Para si', end: true },
  { to: '/estudante/perfil', label: 'Perfil' },
  { to: '/estudante/favoritos', label: 'Bolsas guardadas' },
  { to: '/estudante/candidaturas', label: 'Candidaturas' },
  { to: '/cursos', label: 'Cursos e mentorias' },
]
const mentorNav = [
  { to: '/mentor', label: 'Perfil profissional', end: true },
  { to: '/mentor/servicos', label: 'Os meus serviços' },
]
const adminNav = [
  { to: '/admin', label: 'Utilizadores', end: true },
  { to: '/admin/mentores', label: 'Mentores' },
  { to: '/admin/bolsas', label: 'Bolsas' },
  { to: '/admin/denuncias', label: 'Denúncias' },
  { to: '/admin/relatorios', label: 'Relatórios' },
  { to: '/admin/integracoes', label: 'Integrações' },
  { to: '/admin/auditoria', label: 'Auditoria' },
]

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="bolsas" element={<ScholarshipsPage />} />
        <Route path="bolsas/:id" element={<ScholarshipDetailPage />} />
        <Route path="mentores" element={<MentorsPage />} />
        <Route path="mentores/:id" element={<MentorDetailPage />} />
        <Route path="cursos" element={<CoursesPage />} />
        <Route path="servicos/:id" element={<ServiceDetailPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="contactos" element={<ContactPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="registo" element={<RegisterPage />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="nova-senha" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="estudante" element={<DashboardLayout title="Área do estudante" items={studentNav} />}>
            <Route index element={<StudentHome />} />
            <Route path="perfil" element={<StudentProfilePage />} />
            <Route path="favoritos" element={<StudentFavoritesPage />} />
            <Route path="candidaturas" element={<StudentApplicationsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['mentor']} />}>
          <Route path="mentor" element={<DashboardLayout title="Área do mentor" items={mentorNav} />}>
            <Route index element={<MentorProfilePage />} />
            <Route path="servicos" element={<MentorServicesPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<DashboardLayout title="Administração" items={adminNav} />}>
            <Route index element={<AdminUsersPage />} />
            <Route path="mentores" element={<AdminMentorsPage />} />
            <Route path="bolsas" element={<AdminScholarshipsPage />} />
            <Route path="denuncias" element={<AdminReportedPage />} />
            <Route path="relatorios" element={<AdminReportsPage />} />
            <Route path="integracoes" element={<AdminIntegrationsPage />} />
            <Route path="auditoria" element={<AdminAuditPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
