# Kwanza Oportunidades — frontend

Plataforma de bolsas de estudo e mentorias pagas para estudantes angolanos.
React 19 · Vite 6 · TypeScript · Tailwind CSS v4 · React Router · Axios · React Hook Form + Zod · Lucide · Sonner.

## Instalar e executar

Requisitos: Node.js 20 ou superior.

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção
```

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL base da API REST (ex.: `https://api.exemplo.ao/v1`). Centralizada em `src/lib/env.ts`. |
| `VITE_DEMO_MODE` | `true` usa dados de demonstração em memória (sem backend). Também activo se `VITE_API_URL` estiver vazio. |
| `VITE_DEMO_REFERENCE_DATE` | Data de referência do modo demo (por omissão `2026-10-26`) usada para calcular bolsas abertas/expiradas. |
| `VITE_SUPPORT_EMAIL` | Email de suporte mostrado nas páginas públicas. |

O `.env.example` não contém segredos. Nunca coloques chaves ou tokens em variáveis `VITE_*`.

## Modo de demonstração

Com `VITE_DEMO_MODE=true` um adaptador do Axios (`src/services/demoAdapter.ts`) simula a API. Todo o conteúdo é fictício e identificado como demonstração.

Contas de exemplo (qualquer senha com 12 ou mais caracteres):

- Estudante: `ana@estudante.example`
- Mentor: `celina@mentor.example`
- Administração: `lidia@admin.example`

A recuperação de senha devolve sempre uma resposta neutra e nunca simula sucesso na redefinição.

## Segurança e autenticação

- Sem tokens nem senhas guardados no frontend (sem `localStorage`). O cliente usa `withCredentials` para cookies `HttpOnly` + `SameSite` definidos pelo backend; em modo demo só fica o id de uma conta fictícia em `sessionStorage`.
- Os guardas de rota (`RequireRole`) servem apenas navegação: a autorização real tem de ser feita pela API.
- Erros 400/401/403/404/409/422/500 tratados em `src/lib/errors.ts`; um 401 dispara o evento de sessão expirada.
- Botão WhatsApp: `https://wa.me/NUMERO?text=MENSAGEM`, número só com dígitos (incl. 244), mensagem codificada, apenas se o mentor autorizou.
- Bolsas expiradas nunca aparecem como abertas (estado derivado do prazo).

## Estrutura

```
src/
  components/  ui/ (campos, tabelas, avisos, diálogos)
  contexts/    sessão e favoritos
  data/        dados de demonstração
  hooks/       useAsync, useDocumentTitle
  layouts/     público, autenticação, painéis
  lib/         env, formatação, erros
  pages/       public/ auth/ student/ mentor/ admin/
  routes/      guardas por papel
  schemas/     validação Zod
  services/    cliente HTTP e serviços da API
  types/
```

## Rotas

Públicas: `/`, `/bolsas`, `/mentores`, `/cursos-e-mentorias`, `/sobre-nos`, `/contactos`, `/perguntas-frequentes`, … ·
Auth: `/entrar`, `/registo`, `/recuperar-senha`, `/nova-senha` ·
Estudante `/estudante/*` · Mentor `/mentor/*` · Administração `/admin/*`.
