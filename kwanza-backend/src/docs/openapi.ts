/** Documento OpenAPI 3.0 servido em /api/v1/openapi.json (e Swagger UI fora de produção). */
type Obj = Record<string, unknown>;

const errorExample = {
  error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: [{ field: 'body.email', message: 'Email inválido.' }], requestId: 'b1f6c3e2-…' },
};
const err = (description: string) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: errorExample } } });
const ok = (description: string, example?: unknown, schema: Obj = { type: 'object' }) => ({
  description,
  content: { 'application/json': { schema, ...(example ? { example } : {}) } },
});
const body = (example: unknown) => ({ required: true, content: { 'application/json': { schema: { type: 'object' }, example } } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];
const q = (name: string, description: string, schema: Obj = { type: 'string' }) => ({ name, in: 'query', description, schema });
const secured = [{ cookieAuth: [] }, { bearerAuth: [] }];

const scholarshipExample = {
  id: '0b0f6c0e-7f0b-4a3e-9d57-6f5b8d2f1a11',
  slug: 'bolsa-mestrado-portugal-a1b2c3',
  title: 'Bolsa de Mestrado em Engenharia - Portugal',
  sponsoringInstitution: 'Universidade de Lisboa',
  destinationCountry: 'Portugal',
  educationLevel: ['MASTER'],
  studyAreas: ['engenharia'],
  fundingType: 'FULL',
  openingDate: '2026-09-01',
  applicationDeadline: '2026-12-15',
  deadlineTimezone: 'Africa/Luanda',
  officialUrl: 'https://exemplo.pt/bolsa',
  source: { id: '…', name: 'INAGBE', url: 'https://inagbe.gov.ao/…', domain: 'inagbe.gov.ao', type: 'GOVERNMENT' },
  sourceLastCheckedAt: '2026-10-20T10:00:00.000Z',
  verification: { status: 'VERIFIED', verifiedAt: '2026-10-20T10:00:00.000Z', isStale: false },
  validity: 'OPEN',
  isOpen: true,
  daysRemaining: 51,
};

const paths: Record<string, Obj> = {
  '/auth/register/student': { post: { tags: ['Auth'], summary: 'Registo de estudante', requestBody: body({ name: 'Maria Silva', email: 'maria@exemplo.com', password: 'SenhaSegura123' }), responses: { 201: ok('Conta criada (email de verificação enviado)', { data: { id: '…', name: 'Maria Silva', email: 'maria@exemplo.com', role: 'STUDENT', emailVerified: false } }), 400: err('Validação'), 409: err('Email já registado'), 429: err('Rate limit') } } },
  '/auth/register/mentor': { post: { tags: ['Auth'], summary: 'Registo de mentor (fica PENDING até aprovação)', requestBody: body({ name: 'João Mentor', email: 'joao@exemplo.com', password: 'SenhaSegura123', bio: 'Orientador de candidaturas…', specialties: ['candidaturas'] }), responses: { 201: ok('Conta criada'), 400: err('Validação'), 409: err('Email já registado') } } },
  '/auth/login': { post: { tags: ['Auth'], summary: 'Login (define cookies HttpOnly kw_access e kw_refresh)', requestBody: body({ email: 'maria@exemplo.com', password: 'SenhaSegura123' }), responses: { 200: ok('Autenticado', { data: { user: { id: '…', role: 'STUDENT' } } }), 401: err('Credenciais inválidas'), 429: err('Conta temporariamente bloqueada / rate limit') } } },
  '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotaciona o refresh token (cookie) e emite novo access token', responses: { 200: ok('Sessão renovada'), 401: err('Sessão inválida') } } },
  '/auth/logout': { post: { tags: ['Auth'], summary: 'Termina a sessão actual', responses: { 204: { description: 'Sessão terminada' } } } },
  '/auth/logout-all': { post: { tags: ['Auth'], summary: 'Termina todas as sessões', security: secured, responses: { 204: { description: 'OK' }, 401: err('Não autenticado') } } },
  '/auth/sessions': { get: { tags: ['Auth'], summary: 'Lista sessões activas', security: secured, responses: { 200: ok('Sessões') } } },
  '/auth/sessions/{id}': { delete: { tags: ['Auth'], summary: 'Revoga uma sessão própria', security: secured, parameters: [idParam], responses: { 204: { description: 'OK' }, 404: err('Não encontrada') } } },
  '/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Pede recuperação de senha (resposta sempre neutra)', requestBody: body({ email: 'maria@exemplo.com' }), responses: { 202: ok('Mensagem neutra', { data: { message: 'Se o email estiver registado, enviámos instruções para redefinir a senha.' } }) } } },
  '/auth/reset-password': { post: { tags: ['Auth'], summary: 'Redefine a senha com o token do email (uso único)', requestBody: body({ token: '<token do link>', newPassword: 'NovaSenha12345' }), responses: { 200: ok('Senha redefinida; sessões anteriores revogadas'), 400: err('Token inválido/expirado') } } },
  '/auth/verify-email': { post: { tags: ['Auth'], summary: 'Confirma o email', requestBody: body({ token: '<token do link>' }), responses: { 200: ok('Email confirmado'), 400: err('Token inválido/expirado') } } },
  '/auth/resend-verification': { post: { tags: ['Auth'], summary: 'Reenvia email de verificação', security: secured, responses: { 202: ok('Pedido aceite') } } },
  '/auth/change-password': { post: { tags: ['Auth'], summary: 'Altera a senha (termina as outras sessões)', security: secured, requestBody: body({ currentPassword: 'SenhaSegura123', newPassword: 'NovaSenha12345' }), responses: { 200: ok('OK'), 400: err('Senha actual incorrecta') } } },

  '/users/me': {
    get: { tags: ['Users'], summary: 'Perfil do utilizador autenticado', security: secured, responses: { 200: ok('Perfil') } },
    patch: { tags: ['Users'], summary: 'Actualiza o próprio perfil', security: secured, requestBody: body({ name: 'Maria S.', studentProfile: { academicLevel: 'BACHELOR', destinationCountries: ['Portugal'] } }), responses: { 200: ok('Perfil actualizado'), 400: err('Validação') } },
  },

  '/scholarships': { get: { tags: ['Scholarships'], summary: 'Lista bolsas publicadas (por omissão apenas abertas)', parameters: [...pageParams, q('q', 'Pesquisa por título, instituição ou palavra-chave'), q('country', 'País de destino'), q('institutionCountry', 'País da instituição'), q('level', 'Nível (BACHELOR,MASTER,…; separados por vírgula)'), q('area', 'Área de estudo (vírgulas)'), q('mode', 'ONLINE | IN_PERSON | HYBRID'), q('funding', 'FULL | PARTIAL | TUITION_ONLY | STIPEND | OTHER'), q('state', 'open (omissão) | upcoming | closed | unknown | all'), q('deadlineBefore', 'AAAA-MM-DD'), q('deadlineAfter', 'AAAA-MM-DD'), q('sort', 'deadline_asc | deadline_desc | recent | title')], responses: { 200: ok('Página de bolsas', { data: [scholarshipExample], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }) } } },
  '/scholarships/{idOrSlug}': { get: { tags: ['Scholarships'], summary: 'Detalhe de uma bolsa publicada', parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok('Bolsa', { data: scholarshipExample }), 404: err('Não encontrada') } } },
  '/me/favorites': { get: { tags: ['Favorites'], summary: 'Bolsas guardadas pelo estudante', security: secured, parameters: pageParams, responses: { 200: ok('Favoritos') } } },
  '/me/favorites/{id}': {
    put: { tags: ['Favorites'], summary: 'Guarda uma bolsa (idempotente)', security: secured, parameters: [idParam], responses: { 204: { description: 'Guardada' }, 404: err('Bolsa não encontrada') } },
    delete: { tags: ['Favorites'], summary: 'Remove dos favoritos', security: secured, parameters: [idParam], responses: { 204: { description: 'Removida' } } },
  },

  '/mentors': { get: { tags: ['Mentors'], summary: 'Mentores verificados', parameters: [...pageParams, q('q', 'Nome, bio ou especialidade'), q('specialty', 'Especialidade'), q('language', 'Idioma')], responses: { 200: ok('Mentores', { data: [{ id: '…', name: 'João Mentor', verified: true, specialties: ['candidaturas'], whatsapp: { e164: '+244923456789', waDigits: '244923456789', url: 'https://wa.me/244923456789', urlWithMessage: null, suggestedMessage: null } }] }) } } },
  '/mentors/{id}': { get: { tags: ['Mentors'], summary: 'Detalhe do mentor com serviços e cursos publicados', parameters: [idParam], responses: { 200: ok('Mentor'), 404: err('Não encontrado') } } },
  '/mentors/me': {
    get: { tags: ['Mentors'], summary: 'Perfil do mentor autenticado', security: secured, responses: { 200: ok('Perfil') } },
    patch: { tags: ['Mentors'], summary: 'Edita o perfil (número WhatsApp normalizado para E.164)', security: secured, requestBody: body({ bio: 'Mais de 5 anos a orientar candidaturas.', whatsappNumber: '+244 923 456 789', allowWhatsappPublic: true }), responses: { 200: ok('Perfil'), 400: err('Número inválido') } },
  },
  '/mentors/me/submit': { post: { tags: ['Mentors'], summary: 'Submete o perfil para verificação', security: secured, responses: { 200: ok('Submetido'), 400: err('Perfil incompleto') } } },

  '/mentor-services': {
    get: { tags: ['Services'], summary: 'Serviços de mentores verificados', parameters: [...pageParams, q('q', 'Pesquisa'), q('category', 'Categoria'), q('mode', 'Modalidade'), q('currency', 'Moeda'), q('minPrice', 'Preço mínimo (requer currency)', { type: 'number' }), q('maxPrice', 'Preço máximo (requer currency)', { type: 'number' }), q('sort', 'recent | price_asc | price_desc')], responses: { 200: ok('Serviços') } },
    post: { tags: ['Services'], summary: 'Cria serviço (rascunho) - mentor', security: secured, requestBody: body({ title: 'Revisão de carta de motivação', description: 'Revisão detalhada com feedback em 48 horas.', category: 'APPLICATION_SUPPORT', price: 15000, currency: 'AOA', durationMinutes: 60, mode: 'ONLINE' }), responses: { 201: ok('Criado'), 403: err('Sem permissão') } },
  },
  '/mentor-services/mine': { get: { tags: ['Services'], summary: 'Os meus serviços', security: secured, responses: { 200: ok('Serviços') } } },
  '/mentor-services/{id}': {
    get: { tags: ['Services'], summary: 'Detalhe público', parameters: [idParam], responses: { 200: ok('Serviço'), 404: err('Não encontrado') } },
    patch: { tags: ['Services'], summary: 'Edita serviço próprio', security: secured, parameters: [idParam], requestBody: body({ price: 18000 }), responses: { 200: ok('Actualizado'), 404: err('Não encontrado (ou de outro mentor)') } },
  },
  '/mentor-services/{id}/status': { post: { tags: ['Services'], summary: 'Publica/desactiva/arquiva (publicar exige mentor verificado)', security: secured, parameters: [idParam], requestBody: body({ to: 'PUBLISHED' }), responses: { 200: ok('OK'), 403: err('Mentor não aprovado') } } },
  '/courses': {
    get: { tags: ['Courses'], summary: 'Cursos publicados (filtros: category, price, mode)', parameters: [...pageParams, q('category', 'Categoria'), q('mode', 'Modalidade'), q('currency', 'Moeda'), q('minPrice', 'Preço mínimo', { type: 'number' }), q('maxPrice', 'Preço máximo', { type: 'number' })], responses: { 200: ok('Cursos') } },
    post: { tags: ['Courses'], summary: 'Cria curso (rascunho) - mentor', security: secured, requestBody: body({ title: 'Preparação para IELTS', description: 'Curso intensivo de 4 semanas.', category: 'Idiomas', price: 50000, currency: 'AOA', mode: 'ONLINE', enrollmentUrl: 'https://exemplo.com/inscricao' }), responses: { 201: ok('Criado') } },
  },
  '/courses/mine': { get: { tags: ['Courses'], summary: 'Os meus cursos', security: secured, responses: { 200: ok('Cursos') } } },
  '/courses/{id}': {
    get: { tags: ['Courses'], summary: 'Detalhe público', parameters: [idParam], responses: { 200: ok('Curso'), 404: err('Não encontrado') } },
    patch: { tags: ['Courses'], summary: 'Edita curso próprio', security: secured, parameters: [idParam], requestBody: body({ price: 45000 }), responses: { 200: ok('Actualizado') } },
  },
  '/courses/{id}/status': { post: { tags: ['Courses'], summary: 'Publica/desactiva/arquiva', security: secured, parameters: [idParam], requestBody: body({ to: 'UNPUBLISHED' }), responses: { 200: ok('OK') } } },

  '/inquiries': { post: { tags: ['Inquiries'], summary: 'Estudante regista interesse num serviço; devolve dados para wa.me (se autorizado). Não há pagamento nem reserva automática.', security: secured, requestBody: body({ mentorServiceId: '…', message: 'Gostaria de saber disponibilidade.' }), responses: { 201: ok('Pedido criado'), 409: err('Pedido em curso') } } },
  '/inquiries/mine': { get: { tags: ['Inquiries'], summary: 'Pedidos do estudante', security: secured, responses: { 200: ok('Pedidos') } } },
  '/inquiries/received': { get: { tags: ['Inquiries'], summary: 'Pedidos recebidos pelo mentor', security: secured, responses: { 200: ok('Pedidos') } } },
  '/inquiries/{id}/status': { patch: { tags: ['Inquiries'], summary: 'Actualiza estado (mentor) ou encerra (estudante)', security: secured, parameters: [idParam], requestBody: body({ status: 'CONTACTED' }), responses: { 200: ok('OK'), 404: err('Não encontrado') } } },
  '/reports': { post: { tags: ['Reports'], summary: 'Denuncia mentor, serviço ou curso', security: secured, requestBody: body({ targetType: 'MENTOR_SERVICE', targetId: '…', reason: 'SCAM', details: 'Pede pagamento antecipado fora da plataforma.' }), responses: { 201: ok('Denúncia registada'), 409: err('Já denunciado') } } },

  '/admin/scholarships': {
    get: { tags: ['Admin'], summary: 'Lista todas as bolsas (qualquer estado)', security: secured, parameters: [...pageParams, q('status', 'DRAFT | IN_REVIEW | PUBLISHED | ARCHIVED'), q('verification', 'UNVERIFIED | PENDING | VERIFIED | REJECTED')], responses: { 200: ok('Bolsas') } },
    post: { tags: ['Admin'], summary: 'Cria bolsa manualmente (nasce DRAFT/UNVERIFIED)', security: secured, requestBody: body({ title: 'Bolsa de Mestrado em Engenharia', description: 'Descrição detalhada da bolsa…', sponsoringInstitution: 'Universidade de Lisboa', destinationCountry: 'Portugal', educationLevel: ['MASTER'], studyAreas: ['engenharia'], fundingType: 'FULL', applicationDeadline: '2026-12-15', officialUrl: 'https://exemplo.pt/bolsa', sourceId: '…' }), responses: { 201: ok('Criada'), 403: err('Não é administrador') } },
  },
  '/admin/scholarships/{id}': { get: { tags: ['Admin'], summary: 'Detalhe administrativo', security: secured, parameters: [idParam], responses: { 200: ok('Bolsa') } }, patch: { tags: ['Admin'], summary: 'Edita bolsa (auditado)', security: secured, parameters: [idParam], requestBody: body({ applicationDeadline: '2026-12-31' }), responses: { 200: ok('Actualizada') } } },
  '/admin/scholarships/{id}/verify': { post: { tags: ['Admin'], summary: 'Verifica/rejeita bolsa', security: secured, parameters: [idParam], requestBody: body({ decision: 'VERIFIED' }), responses: { 200: ok('OK') } } },
  '/admin/scholarships/{id}/mark-checked': { post: { tags: ['Admin'], summary: 'Regista que a fonte foi reverificada agora', security: secured, parameters: [idParam], responses: { 200: ok('OK') } } },
  '/admin/scholarships/{id}/transition': { post: { tags: ['Admin'], summary: 'Muda estado de publicação (publicar exige VERIFIED, fonte verificada e prazo não expirado)', security: secured, parameters: [idParam], requestBody: body({ to: 'PUBLISHED' }), responses: { 200: ok('OK'), 409: err('Transição inválida') } } },
  '/admin/mentors': { get: { tags: ['Admin'], summary: 'Mentores por estado de verificação', security: secured, parameters: [...pageParams, q('status', 'PENDING | VERIFIED | REJECTED | SUSPENDED')], responses: { 200: ok('Mentores') } } },
  '/admin/mentors/{id}/review': { post: { tags: ['Admin'], summary: 'Aprova, rejeita ou suspende mentor', security: secured, parameters: [idParam], requestBody: body({ decision: 'REJECTED', reason: 'Documentação insuficiente.' }), responses: { 200: ok('OK') } } },
  '/admin/catalog/{kind}': { get: { tags: ['Admin'], summary: 'Serviços ou cursos (kind = services | courses) para moderação', security: secured, parameters: [{ name: 'kind', in: 'path', required: true, schema: { type: 'string', enum: ['services', 'courses'] } }], responses: { 200: ok('Lista') } } },
  '/admin/catalog/{kind}/{id}/moderate': { post: { tags: ['Admin'], summary: 'Modera conteúdo (UNPUBLISH | ARCHIVE | RESTORE)', security: secured, parameters: [{ name: 'kind', in: 'path', required: true, schema: { type: 'string', enum: ['services', 'courses'] } }, idParam], requestBody: body({ action: 'UNPUBLISH', reason: 'Conteúdo enganoso.' }), responses: { 200: ok('OK') } } },
  '/admin/reports': { get: { tags: ['Admin'], summary: 'Denúncias', security: secured, responses: { 200: ok('Denúncias') } } },
  '/admin/reports/{id}/resolve': { post: { tags: ['Admin'], summary: 'Trata uma denúncia', security: secured, parameters: [idParam], requestBody: body({ outcome: 'RESOLVED', note: 'Serviço removido.' }), responses: { 200: ok('OK') } } },
  '/admin/users': { get: { tags: ['Admin'], summary: 'Utilizadores', security: secured, responses: { 200: ok('Utilizadores') } } },
  '/admin/users/{id}/active': { patch: { tags: ['Admin'], summary: 'Activa/desactiva conta (revoga sessões)', security: secured, parameters: [idParam], requestBody: body({ isActive: false }), responses: { 204: { description: 'OK' } } } },
  '/admin/audit-logs': { get: { tags: ['Admin'], summary: 'Registos de auditoria', security: secured, responses: { 200: ok('Auditoria') } } },
  '/admin/sources': { get: { tags: ['Integrations'], summary: 'Fontes de bolsas', security: secured, responses: { 200: ok('Fontes') } }, post: { tags: ['Integrations'], summary: 'Regista fonte', security: secured, requestBody: body({ name: 'INAGBE', officialUrl: 'https://inagbe.gov.ao/', sourceType: 'GOVERNMENT', collectionMethod: 'MANUAL' }), responses: { 201: ok('Criada') } } },
  '/admin/integrations': { get: { tags: ['Integrations'], summary: 'Conectores disponíveis e se há integração autorizada configurada', security: secured, responses: { 200: ok('Conectores', { data: [{ key: 'inagbe', configured: false, capabilities: { automaticImport: false, manualEntry: true } }] }) } } },
  '/admin/integrations/{key}/import': { post: { tags: ['Integrations'], summary: 'Importa de um feed autorizado. Sem integração configurada devolve 503 (use introdução manual).', security: secured, parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' }, example: 'inagbe' }], responses: { 200: ok('Estatísticas da importação'), 502: err('Falha da fonte externa'), 503: err('Sem integração autorizada') } } },
  '/admin/integrations/{key}/manual': { post: { tags: ['Integrations'], summary: 'Introdução manual de bolsa da fonte (o link oficial tem de pertencer ao domínio da fonte)', security: secured, parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: ok('Criada como rascunho') } } },
  '/admin/scholarships/{id}/source-changes': { get: { tags: ['Integrations'], summary: 'Alterações externas pendentes de revisão', security: secured, parameters: [idParam], responses: { 200: ok('Alterações') } } },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Kwanza Oportunidades API',
    version: '1.0.0',
    description:
      'API de bolsas de estudo, cursos e mentorias. Autenticação por cookies HttpOnly (kw_access / kw_refresh) ou `Authorization: Bearer`. ' +
      'Respostas de sucesso: `{ data, meta? }`. Erros: `{ error: { code, message, details?, requestId } }`. ' +
      'O contacto com mentores é feito por WhatsApp; a plataforma NÃO processa pagamentos nem reservas.',
  },
  servers: [{ url: '/api/v1' }],
  tags: ['Auth', 'Users', 'Scholarships', 'Favorites', 'Mentors', 'Services', 'Courses', 'Inquiries', 'Reports', 'Admin', 'Integrations'].map((name) => ({ name })),
  paths,
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'kw_access' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
