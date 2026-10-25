# Kwanza Oportunidades — Backend

API REST (Node.js + Express + TypeScript + PostgreSQL + Prisma) para bolsas de estudo, cursos e mentorias.
O contacto entre estudantes e mentores é feito por WhatsApp. **Não existe pagamento integrado nem reserva automática.**

## Requisitos
Node 20+, PostgreSQL 14+.

## Instalação
```bash
npm install
cp .env.example .env            # defina DATABASE_URL e JWT_SECRET (openssl rand -base64 48)
```

### Base de dados
O `prisma/schema.prisma` é o que forneceste. **Falta-lhe a tabela de denúncias**: acrescenta o conteúdo de
`prisma/additions.prisma` (modelo `Report`, 3 enums e 2 relações no `User`) e corre:
```bash
npx prisma migrate dev --name add_reports     # desenvolvimento
npx prisma migrate deploy                      # produção
npx prisma generate
```
Seed e migrações anteriores ficam por tua conta (já os tens).

### Primeiro administrador (provisionamento seguro; não há registo público de ADMIN)
```bash
ADMIN_EMAIL=admin@exemplo.ao ADMIN_NAME="Admin" npm run admin:create   # pede a senha sem eco
```

### Executar
```bash
npm run dev          # desenvolvimento (tsx watch)
npm run build && npm start
```
Swagger UI: `http://localhost:3333/api/v1/docs` (desactivado em produção). OpenAPI JSON: `/api/v1/openapi.json`.

## Testes
```bash
docker compose up -d db_test        # ou use qualquer PostgreSQL vazio
DATABASE_URL=postgresql://kwanza:kwanza_dev@localhost:5433/kwanza_test npx prisma migrate deploy
DATABASE_URL=postgresql://kwanza:kwanza_dev@localhost:5433/kwanza_test npm test
```
**A base de testes é APAGADA (TRUNCATE) entre testes. Nunca aponte para dados reais.**
71 testes: registo/login, bloqueio, sessões e rotação de refresh token, CSRF/CORS, recuperação de senha
(neutralidade, hash, expiração, uso único, concorrência), permissões por papel, isolamento entre utilizadores,
bolsas (publicação/aprovação, validade e fuso horário, pesquisa, filtros, paginação), favoritos, mentores,
WhatsApp, serviços/cursos, pedidos, denúncias, moderação e integrações (falhas externas, domínios, revisão).

## Decisões de segurança
- **Sessões**: access token JWT (15 min) + refresh token opaco rotativo (hash SHA-256 na BD, tabela `refresh_tokens`), ambos em cookies **HttpOnly** (`Secure` em produção). O refresh só é enviado a `/api/v1/auth`. A sessão é verificada na BD em cada pedido, por isso logout/revogação é imediato. Reutilização de um refresh token antigo revoga todas as sessões.
- **CSRF**: pedidos que alteram estado com cookie exigem `Origin`/`Referer` na lista `CORS_ORIGINS`, além de `SameSite`. CORS restrito.
- **Senhas**: Argon2id; verificação fictícia quando o email não existe (sem diferença de tempo); política mínima de 10 caracteres.
- **Bloqueio**: após `LOGIN_MAX_FAILURES` falhas o email fica bloqueado `LOGIN_LOCK_MINUTES` (em memória — para várias instâncias implemente `LoginThrottle` sobre Redis). Além disso, rate limiting por IP em login, registo, recuperação e acções sensíveis.
- **Recuperação**: token de 256 bits, só o hash é guardado, validade 30 min, consumo atómico (`updateMany` condicional em transacção), revoga todas as sessões, resposta sempre neutra, link construído só com `FRONTEND_URL`, nunca registado em logs (em desenvolvimento, os emails vão para `.dev-mail/`).
- **Autorização** no servidor por papel e por dono do recurso (recursos de outros devolvem 404). Auditoria das acções administrativas em `audit_logs` (campos sensíveis redigidos).
- **Dados**: Zod em todas as entradas (`.strict()`), Prisma parametrizado, limite de 100 KB por pedido, Helmet, logs com redacção de senhas/tokens/números.

## Bolsas
- Estados `DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`. **"Expirada" não é um estado gravado**: a validade (`OPEN | UPCOMING | CLOSED | UNKNOWN`) é calculada em cada consulta a partir de `openingDate`/`applicationDeadline`, com o fuso `DEFAULT_TIMEZONE` (Africa/Luanda). O prazo é inclusivo (aberta durante todo o dia). Sem prazo → `UNKNOWN`, nunca "aberta". A acessibilidade do link não é usada.
- Só se publica uma bolsa `VERIFIED`, com data de última verificação da fonte e prazo não expirado. `verification.isStale` indica fontes não reverificadas há mais de `SCHOLARSHIP_STALE_DAYS`.
- Listagem pública: `state=open` por omissão; filtros `q, country, institutionCountry, level, area, mode, funding, deadlineBefore/After, state, sort, page, pageSize`.

## Integração INAGBE e outras fontes
- **Não se assume nenhuma API pública do INAGBE e não se faz scraping** do portal. Sem integração autorizada, `POST /admin/integrations/inagbe/import` devolve **503** e o administrador usa a **introdução manual** (`POST /admin/integrations/inagbe/manual`), cujo link oficial tem de pertencer a `inagbe.gov.ao`.
- Se o INAGBE (ou parceiro) disponibilizar formalmente um feed JSON, define `INAGBE_AUTHORIZED_FEED_URL`; o feed tem de seguir o contrato em `src/integrations/scholarships/types.ts` (ajustar o mapeador em `inagbe.connector.ts` ao formato real quando houver documentação).
- Novas fontes = novo `ScholarshipConnector` registado em `app.ts`. Pedidos externos: só HTTPS, timeout, tamanho máximo, sem redirecionamentos.
- Importação: dados nascem `DRAFT/UNVERIFIED`; duplicados detectados por `externalId` e URL oficial; guarda origem, data de recolha e payload; **nunca substitui dados validados** — as diferenças ficam pendentes (`GET /admin/scholarships/:id/source-changes`) para o admin aplicar ou descartar. Falhas marcam a fonte `FAILED` sem afectar a API.

## Ligar ao frontend React
1. `.env`: `CORS_ORIGINS=http://localhost:5173`, `FRONTEND_URL=http://localhost:5173`.
2. Todos os pedidos com cookies:
```ts
// api.ts
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const run = () => fetch(`${import.meta.env.VITE_API_URL}/api/v1${path}`, {
    ...init, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  let res = await run();
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if ((await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' })).ok) res = await run();
  }
  if (!res.ok) throw (await res.json()).error;      // { code, message, details, requestId }
  return res.status === 204 ? (undefined as T) : res.json();
}
```
3. Dev: use um proxy do Vite (`/api` → `localhost:3333`) ou o mesmo "site" para `SameSite=Lax`. Em produção com domínios diferentes: HTTPS e `COOKIE_SAMESITE=none`.
4. Rotas do frontend esperadas pelos emails: `/reset-password?token=…` e `/verify-email?token=…` (fazem `POST /auth/reset-password` e `/auth/verify-email` com `{ token }`).
5. WhatsApp: use `mentor.whatsapp.urlWithMessage` (ou `url` + `?text=${encodeURIComponent(msg)}`); é `null` se o mentor não autorizou.
6. Respostas: `{ data, meta? }`; erros `{ error: { code, message, details?, requestId } }`.

## Estrutura
`src/{config,middlewares,modules/*,integrations,db,utils,types,docs}`, `tests/`, `scripts/create-admin.ts`, `prisma/`.
Módulos: auth, users, scholarships (+favoritos), mentors, catalog (serviços e cursos), inquiries, reports, integrations, admin.

## Limitações conhecidas
- Bloqueio de login em memória (uma instância). Sem upload de ficheiros nem pagamentos.
- Tabela `applications` e `notifications` existem no schema mas não têm endpoints (fora do âmbito pedido).
- Rotas de moderação de perfis de mentor via denúncia são manuais (o admin vê a denúncia e age no mentor/serviço).
