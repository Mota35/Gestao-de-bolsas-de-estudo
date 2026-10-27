import type { AdminAuditEntry, AdminIntegration, AdminIntegrationLog, AdminMentorReview, AdminOverview, AdminReport, AdminUser } from '../types/area'

export const demoAdminOverview: AdminOverview = {
  users: { total: 128, students: 104, mentors: 24 },
  scholarships: { total: 18, open: 14, expired: 4 },
  pendingMentors: 6,
  pendingReports: 4,
  weekly: [
    { label: '1–7 out.', value: 180 },
    { label: '8–14 out.', value: 240 },
    { label: '15–21 out.', value: 320 },
    { label: '22–26 out.', value: 280 },
  ],
  content: [
    { label: 'Bolsas de estudo', value: 620 },
    { label: 'Perfis de mentores', value: 260 },
    { label: 'Cursos e mentorias', value: 140 },
  ],
  pending: [
    { type: 'Mentor', resource: 'Joana Tavares', date: '25 de outubro de 2026', state: 'Pendente', next: 'Analisar perfil' },
    { type: 'Bolsa', resource: 'Programa Pontes', date: '26 de outubro de 2026', state: 'Fonte por rever', next: 'Consultar fonte' },
    { type: 'Denúncia', resource: 'Curso de escrita', date: '26 de outubro de 2026', state: 'Por analisar', next: 'Abrir denúncia' },
    { type: 'Integração', resource: 'Fonte Aurora', date: '26 de outubro de 2026', state: 'Erro simulado', next: 'Ver registos' },
  ],
}

export const demoAdminUsers: AdminUser[] = [
  { id: 'u1', name: 'Ana Mavungo', role: 'Estudante', state: 'Activa', createdAt: '20 de outubro de 2026', action: 'Gerir papel' },
  { id: 'u2', name: 'Celina Manuel', role: 'Mentor', state: 'Activa · pendente', createdAt: '21 de outubro de 2026', action: 'Rever permissões' },
  { id: 'u3', name: 'Joana Tavares', role: 'Mentor', state: 'Activa · pendente', createdAt: '25 de outubro de 2026', action: 'Gerir papel' },
  { id: 'u4', name: 'Mateus Kiala', role: 'Mentor', state: 'Activa', createdAt: '22 de outubro de 2026', action: 'Gerir papel' },
  { id: 'u5', name: 'Paulo Caxito', role: 'Estudante', state: 'Suspensa · exemplo', createdAt: '18 de outubro de 2026', action: 'Rever estado' },
  { id: 'u6', name: 'Lídia Santos', role: 'Administrador', state: 'Activa · restrita', createdAt: '1 de outubro de 2026', action: 'Consultar acesso' },
]

export const demoMentorReviews: AdminMentorReview[] = [
  { id: 'm1', name: 'Joana Tavares', specialty: 'Escrita académica', requestedAt: '25 de outubro de 2026', state: 'Pendente', action: 'Analisar' },
  { id: 'm2', name: 'Celina Manuel', specialty: 'Bolsas e candidaturas', requestedAt: '24 de outubro de 2026', state: 'Pendente', action: 'Analisar' },
  { id: 'm3', name: 'Daniel Nzinga', specialty: 'Empregabilidade', requestedAt: '23 de outubro de 2026', state: 'Em revisão', action: 'Continuar' },
  { id: 'm4', name: 'Rosa Chimuco', specialty: 'Línguas', requestedAt: '20 de outubro de 2026', state: 'Rejeitada · exemplo', action: 'Consultar motivo' },
]

export const demoReports: AdminReport[] = [
  { id: 'r1', resource: 'Curso de escrita académica', type: 'Promessa de bolsa', receivedAt: '26 de outubro de 2026', state: 'Por analisar', action: 'Abrir denúncia' },
  { id: 'r2', resource: 'Mentoria de carreira', type: 'Preço pouco claro', receivedAt: '25 de outubro de 2026', state: 'Em análise', action: 'Continuar' },
  { id: 'r3', resource: 'Curso de programação', type: 'Conteúdo inadequado', receivedAt: '24 de outubro de 2026', state: 'Por analisar', action: 'Abrir denúncia' },
  { id: 'r4', resource: 'Mentoria de línguas', type: 'Contacto sem autorização', receivedAt: '23 de outubro de 2026', state: 'Resolvida · exemplo', action: 'Ver decisão' },
]

export const demoIntegrations: AdminIntegration[] = [
  { id: 'i1', origin: 'Portal Horizonte', type: 'Importação manual', lastSync: ['25 out. 2026 · 10h00', 'Simulado'], state: 'Desligada', action: 'Ver configuração' },
  { id: 'i2', origin: 'Fonte Aurora', type: 'API de exemplo', lastSync: ['26 out. 2026 · 08h30', 'Tentativa simulada'], state: 'Erro simulado', action: 'Ver registos' },
  { id: 'i3', origin: 'Academia Futuro', type: 'Ficheiro de exemplo', lastSync: ['Não executado'], state: 'Não configurada', action: 'Rever origem' },
  { id: 'i4', origin: 'Fonte Travessia', type: 'API de exemplo', lastSync: ['Não executado'], state: 'Desligada', action: 'Ver configuração' },
]

export const demoIntegrationLogs: AdminIntegrationLog[] = [
  { when: '26 out. 2026 · 08h30', origin: 'Fonte Aurora', event: 'Tentativa de sincronismo simulada', result: 'Erro de teste' },
  { when: '25 out. 2026 · 10h00', origin: 'Portal Horizonte', event: 'Pré-visualização de importação', result: 'Sem alterações reais' },
  { when: '24 out. 2026 · 14h20', origin: 'Fonte Travessia', event: 'Origem desactivada no exemplo', result: 'Desligada' },
]

export const demoAudit: AdminAuditEntry[] = [
  { id: 'a1', when: '26 out. 2026 · 09h12', action: 'Revisão de fonte', user: ['Lídia Santos', 'Administradora'], resource: 'Bolsa Horizonte', result: 'Concluída · exemplo' },
  { id: 'a2', when: '26 out. 2026 · 08h45', action: 'Análise de denúncia', user: ['André Vunge', 'Moderador'], resource: 'Curso de escrita', result: 'Em análise · exemplo' },
  {
    id: 'a3',
    when: '25 out. 2026 · 16h10',
    action: 'Alteração de papel',
    user: ['Lídia Santos', 'Administradora'],
    resource: 'Conta de Joana Tavares',
    result: 'Autorizada · exemplo',
  },
  { id: 'a4', when: '25 out. 2026 · 14h30', action: 'Revisão de mentor', user: ['André Vunge', 'Moderador'], resource: 'Perfil de Daniel Nzinga', result: 'Pendente · exemplo' },
  {
    id: 'a5',
    when: '24 out. 2026 · 11h20',
    action: 'Desactivação editorial',
    user: ['Lídia Santos', 'Administradora'],
    resource: 'Bolsa de teste arquivada',
    result: 'Concluída · exemplo',
  },
  {
    id: 'a6',
    when: '24 out. 2026 · 10h05',
    action: 'Acesso a área restrita',
    user: ['Utilizador de teste', 'Sem permissão'],
    resource: 'Administração',
    result: 'Negado · exemplo',
  },
]
