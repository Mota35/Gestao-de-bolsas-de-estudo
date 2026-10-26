# Kwanza Oportunidades — Frontend

Frontend (nome provisório) da plataforma de bolsas de estudo e mentorias para estudantes angolanos.
React + Vite + TypeScript + Tailwind CSS, preparado para uma API REST.

## Requisitos

- Node.js 18 ou superior
- Uma API REST compatível (ver «Contrato da API» abaixo)

## Instalação e execução

```bash
npm install
cp .env.example .env      # ajuste VITE_API_URL
npm run dev               # http://localhost:5173
```

Outros comandos:

```bash
npm run typecheck         # verificação de tipos
npm run build             # tsc + build de produção em dist/
npm run preview           # pré-visualizar o build
```

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL base da API, sem barra final (ex.: `http://localhost:8000/api`) |

Não coloque segredos em variáveis `VITE_*`: ficam visíveis no browser.

## Sessão e segurança

- A sessão deve ser mantida pelo backend através de **cookies seguros, HttpOnly e SameSite**.
  O cliente Axios usa `withCredentials: true`; nenhum token é guardado em `localStorage`.
- Se a API estiver noutra origem, configure CORS com `Access-Control-Allow-Credentials: true`
  e uma origem explícita. Considere também protecção CSRF no backend.
- As rotas protegidas (`/estudante`, `/mentor`, `/admin`) só melhoram a experiência: **a
  autorização real é sempre do backend**.
- A recuperação de senha depende totalmente da API; o frontend não guarda tokens nem simula sucesso.
  O link de recuperação enviado por email deve apontar para `/nova-senha?token=...`.

## Estrutura

```
src/
  components/   componentes reutilizáveis (ui, cartões, botão WhatsApp)
  contexts/     autenticação e favoritos
  hooks/        useAsync (carregamento/erro)
  layouts/      layout público e de painéis
  pages/        public, auth, student, mentor, admin
  routes/       rotas e ProtectedRoute
  schemas/      validação Zod
  services/     cliente Axios e serviços (auth, bolsas, favoritos, mentores, admin, suporte)
  types/        tipos TypeScript
  utils/        formatação e geração de links WhatsApp
```

## Contrato da API (esperado)

Erros devem usar o formato `{ "message": string, "errors"?: { campo: string[] } }`.
Tratados: 400, 401, 403, 404, 409, 422, 500 e falha de rede.

| Área | Endpoints |
| --- | --- |
| Auth | `GET /auth/me`, `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Bolsas | `GET /scholarships` (q, country, level, field, funding, modality, status, deadlineBefore, sort, page, pageSize, featured), `GET /scholarships/:id` |
| Estudante | `GET/PUT /me/profile`, `GET /me/compatible-scholarships`, `GET /me/favorites`, `PUT/DELETE /me/favorites/:id`, `GET /me/applications` |
| Mentores | `GET /mentors`, `GET /mentors/:id`, `GET /mentors/:id/services`, `GET /services`, `GET /services/:id`, `POST /services/:id/report` |
| Mentor | `GET/PUT /me/mentor`, `GET/POST /me/mentor/services`, `PUT/PATCH/DELETE /me/mentor/services/:id` |
| Suporte | `POST /support/messages` |
| Admin | `/admin/users`, `/admin/mentors`, `/admin/scholarships`, `/admin/services`, `/admin/reports/usage`, `/admin/integrations`, `/admin/audit` |

Listagens paginadas devolvem `{ items, page, pageSize, total }`. O número de WhatsApp de um mentor
só deve ser enviado pela API quando `whatsappPublic` for `true`.

## Regras de conteúdo

- Nenhum dado fictício é embutido no código. Registos de demonstração devem vir da API com
  `isDemo: true`, e são mostrados com o selo «Dados de demonstração».
- Uma bolsa cujo prazo já passou é sempre mostrada como **expirada**, mesmo que a API a envie como aberta.
- Perfis de mentores não verificados e bolsas pendentes de verificação são identificados.
- O botão de candidatura só aparece se a API fornecer um `applicationUrl` real e a bolsa não estiver expirada.

## WhatsApp

O botão gera `https://wa.me/<número>?text=<mensagem codificada>`, com o número só em dígitos e
indicativo `244` (números locais de 9 dígitos recebem o indicativo automaticamente).
