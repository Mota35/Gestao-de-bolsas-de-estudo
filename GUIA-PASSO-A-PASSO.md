# Guia passo a passo — pôr o Kwanza Oportunidades a funcionar

Este guia usa o **PowerShell** (Windows). Abre o terminal do VS Code (`Ctrl+ù` ou *Terminal > Novo terminal*).
Onde vês `<...>`, substitui pelo teu valor.

---

## 0. Estrutura final (o objectivo)

```
Gestao-de-bolsas-de-estudo/
├── README.md                  (o teu, geral)
├── GUIA-PASSO-A-PASSO.md      (este ficheiro — podes colocá-lo aqui)
├── kwanza-backend/            ← API (Node + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma      (com o modelo Report acrescentado)
│   │   ├── migrations/        (copiadas da pasta -db)
│   │   └── seed.ts            (copiado da pasta -db)
│   ├── src/ ...
│   └── .env                   (criado por ti; NUNCA vai para o git)
├── frontend/                  ← React + Vite (SEM pasta prisma)
└── kwanza-oportunidades-db/   ← pasta antiga da BD (fica só como cópia de segurança)
```

**Regra de ouro:** só o `kwanza-backend` fala com a base de dados. O `frontend` fala apenas com a API.

---

## 1. Antes de começar — verifica o que tens

No terminal:

```powershell
node -v        # tem de ser v20 ou superior
npm -v
psql --version # PostgreSQL instalado (ou use Docker)
```

Se o `node -v` for inferior a 20, instala a versão LTS em https://nodejs.org.
O PostgreSQL tem de estar **ligado** e já ter a base de dados que usavas.

---

## 2. Backend — ficheiros a copiar

Situação actual: `kwanza-backend/prisma` só tem `schema.prisma` e `additions.prisma`. **Faltam `migrations` e `seed`.**

A partir da raiz (`Gestao-de-bolsas-de-estudo`):

```powershell
cd kwanza-backend

# copia as migrações e o seed da pasta da BD para o backend
Copy-Item -Recurse -Force ..\kwanza-oportunidades-db\prisma\migrations .\prisma\migrations
Copy-Item -Force ..\kwanza-oportunidades-db\prisma\seed.ts .\prisma\seed.ts
```

Confirma que ficou assim:

```powershell
dir prisma
# deve listar: migrations, additions.prisma, schema.prisma, seed.ts
```

> Se o ficheiro do seed tiver outro nome ou extensão (o Windows mostra `.ts` com ícone de vídeo — é normal),
> vê o nome real com `dir ..\kwanza-oportunidades-db\prisma` e ajusta o comando.

**Não copies** `package.json`, `.env.example`, `.gitignore` nem `README.md` da pasta `-db`: o backend já tem os seus.

---

## 3. Backend — ficheiros a modificar

### 3.1 Acrescentar as denúncias ao schema

O teu schema não tem tabela de denúncias; o backend precisa dela.

1. Abre `kwanza-backend/prisma/additions.prisma`.
2. **Copia os 3 `enum` e o `model Report`** (tudo o que NÃO é comentário `//`) para o **fim** de `prisma/schema.prisma`.
3. No `model User` do `schema.prisma`, acrescenta estas duas linhas junto das outras relações (por exemplo, a seguir a `auditLogs`):

```prisma
  reportsMade     Report[] @relation("ReportReporter")
  reportsResolved Report[] @relation("ReportResolver")
```

4. Grava. Valida com:

```powershell
npx prisma validate
```

Deve dizer *"The schema ... is valid"*.

### 3.2 Criar o ficheiro `.env`

```powershell
Copy-Item .env.example .env
```

Abre o `.env` e preenche **pelo menos**:

| Variável | O que pôr |
|---|---|
| `DATABASE_URL` | Ex.: `postgresql://postgres:A_TUA_SENHA@localhost:5432/NOME_DA_BD?schema=public` (a MESMA base de dados que já usas) |
| `JWT_SECRET` | Um texto aleatório com 32+ caracteres. Gera com o comando abaixo |
| `FRONTEND_URL` | `http://localhost:5173` (o endereço do Vite) |
| `CORS_ORIGINS` | `http://localhost:5173` |

Gerar o `JWT_SECRET`:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

> **Nunca** partilhes o `.env` com ninguém (nem com o Claude) nem o envies para o GitHub. O `.gitignore` já o protege.

O `MAIL_TRANSPORT=outbox` (por omissão) grava os emails na pasta `.dev-mail/` do backend em vez de os enviar.
Para testar a recuperação de senha, abre o ficheiro `.json` mais recente dessa pasta e copia o link.

---

## 4. Backend — o que rodar (por ordem)

Dentro de `kwanza-backend`:

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name add_reports
```

### ⚠️ Se o Prisma pedir para fazer *reset* da base de dados
**Responde NÃO / cancela** — isso apagaria os teus dados. Isto acontece quando a BD foi criada sem histórico de migrações
(por exemplo com `db push`). Para e pede ajuda com a mensagem completa.

### Criar o administrador (não existe registo público de admin)

```powershell
$env:ADMIN_EMAIL="o-teu-email@exemplo.com"; $env:ADMIN_NAME="Administrador"; npm run admin:create
```

Ele pede a senha (não aparece enquanto escreves). Mínimo 10 caracteres, com letras e números.

### Seed (dados de desenvolvimento) — opcional

```powershell
npm run db:seed
```

Cuidados:
- Se o seed criar **utilizadores** com senhas guardadas noutro formato (ex.: bcrypt), esses utilizadores **não conseguirão entrar**: o backend usa Argon2id.
  Cria os utilizadores de teste pela API (`/auth/register/student`) ou pelo Swagger.
- Bolsas do seed com prazo no passado aparecem como **fechadas** (por omissão a listagem só mostra abertas: usa `?state=all`).
- Se o seed falhar por nomes de campos, cola-me o erro.

### Arrancar a API

```powershell
npm run dev
```

Deve aparecer *"API a escutar"* na porta 3333. Testa no browser:

- http://localhost:3333/health → `{"status":"ok"}`
- http://localhost:3333/api/v1/docs → Swagger com todas as rotas

---

## 5. Frontend — o que fazer

### 5.1 Resolver a pasta `prisma` do frontend

Só depois de o backend estar a funcionar (passo 4 concluído):

1. **Faz uma cópia de segurança** de `frontend/prisma` (ex.: para fora do projecto).
2. Apaga `frontend/prisma`.
3. Abre `frontend/package.json` e remove, se existirem, `prisma` e `@prisma/client` (em `dependencies`/`devDependencies`) e qualquer script que comece por `prisma` ou `db:`.
4. No terminal: `cd ..\frontend` e `npm install`.

### 5.2 Configurar o endereço da API

No `frontend/.env` acrescenta:

```
VITE_API_URL=http://localhost:3333
```

(e põe a mesma linha no `.env.example`, sem valores secretos).

### 5.3 Ligar o frontend à API

O backend usa **cookies HttpOnly** (mais seguro que guardar tokens no `localStorage`). Por isso:

- **Todos os pedidos** têm de levar `credentials: 'include'`.
- **Não guardes** tokens no `localStorage`.
- Os dados vêm no formato `{ "data": ..., "meta": ... }` e os erros em `{ "error": { "code", "message", "details" } }`.

Cria `frontend/src/lib/api.ts`:

```ts
const BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export type ApiError = { code: string; message: string; details?: unknown; requestId?: string };

async function raw(path: string, init: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await raw(path, init);
  // access token expirado -> tenta renovar a sessão uma vez
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await raw('/auth/refresh', { method: 'POST' });
    if (refreshed.ok) res = await raw(path, init);
  }
  if (!res.ok) throw ((await res.json().catch(() => null))?.error ?? { code: 'NETWORK', message: 'Erro de rede.' }) as ApiError;
  return (res.status === 204 ? undefined : await res.json()) as T;
}
```

Exemplos de uso:

```ts
// login
await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
// utilizador actual
const { data: me } = await api<{ data: { name: string; role: string } }>('/users/me');
// bolsas abertas, página 1
const { data, meta } = await api<any>('/scholarships?state=open&page=1&pageSize=20');
// guardar favorito
await api(`/me/favorites/${id}`, { method: 'PUT' });
```

Páginas que o backend espera no frontend (os emails apontam para elas):

| Rota do frontend | O que faz |
|---|---|
| `/verify-email?token=...` | Lê o `token` do URL e faz `POST /auth/verify-email` com `{ token }` |
| `/reset-password?token=...` | Mostra o formulário de nova senha e faz `POST /auth/reset-password` com `{ token, newPassword }` |

WhatsApp: usa `mentor.whatsapp.urlWithMessage` (ou `url`). Se vier `null`, o mentor não autorizou — não mostres o botão.

### 5.4 Arrancar

```powershell
npm run dev
```

Abre http://localhost:5173. Mantém **dois terminais abertos**: um com o backend (`npm run dev` em `kwanza-backend`) e outro com o frontend.

---

## 6. Testes (opcional, mas recomendado)

Os testes **apagam todos os dados da base onde correm**. Cria uma base de testes **separada** (nunca a de desenvolvimento):

```powershell
psql -U postgres -c "CREATE DATABASE kwanza_test;"
cd kwanza-backend
$env:DATABASE_URL="postgresql://postgres:A_TUA_SENHA@localhost:5432/kwanza_test?schema=public"
npx prisma migrate deploy
npm test
```

Devem passar 71 testes. (Os comandos `$env:` só valem nesse terminal — fecha-o depois para não ficar a apontar para a base de testes.)

---

## 7. O que ainda falta para o projecto rodar perfeitamente

Marca à medida que fores fazendo.

**Obrigatório:**
- [ ] Copiar `migrations` e `seed` para `kwanza-backend/prisma`
- [ ] Acrescentar o modelo `Report` ao `schema.prisma` e correr `prisma migrate dev`
- [ ] Criar `.env` do backend (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`)
- [ ] Criar o administrador (`npm run admin:create`)
- [ ] Criar `src/lib/api.ts` e `VITE_API_URL` no frontend
- [ ] **Adaptar as páginas do frontend para usarem a API.** Não vi o código do frontend: se ele usa dados fictícios ou outro formato de resposta, cada página precisa de ser ligada aos endpoints (lista no Swagger)
- [ ] Criar as páginas `/verify-email` e `/reset-password`
- [ ] Remover a pasta `prisma` do frontend (e as dependências Prisma do `package.json` dele)

**Antes de publicar na internet (produção):**
- [ ] Configurar um servidor de email real (`MAIL_TRANSPORT=smtp` + `SMTP_*`) e testar o envio
- [ ] HTTPS no frontend e na API; `NODE_ENV=production`; `FRONTEND_URL`/`CORS_ORIGINS` com `https://`
- [ ] Se frontend e API ficarem em domínios diferentes: `COOKIE_SAMESITE=none` (exige HTTPS)
- [ ] Atrás de proxy (Nginx, Render, Railway...): definir `TRUST_PROXY=1`
- [ ] Segredos só em variáveis de ambiente do servidor; fazer backup da BD
- [ ] Bloqueio de login está em memória: se correres várias instâncias da API, precisa de Redis

**Funcionalidades previstas mas ainda sem endpoints** (as tabelas existem no schema):
- [ ] `applications` (candidaturas acompanhadas pelo estudante)
- [ ] `notifications` (notificações)
- [ ] Integração automática com o INAGBE: só será possível se o INAGBE disponibilizar formalmente um feed/API. Até lá, o admin introduz as bolsas manualmente (`POST /admin/integrations/inagbe/manual`)

---

## 8. Problemas comuns

| Mensagem | Causa e solução |
|---|---|
| `Configuração inválida: JWT_SECRET...` | O `.env` não existe ou tem o segredo curto (mínimo 32 caracteres) |
| `P1001: Can't reach database server` | PostgreSQL desligado ou `DATABASE_URL` errada (utilizador, senha, porta, nome da BD) |
| `P3006` / *drift* / pede *reset* | A BD não tem histórico de migrações. **Não faças reset**; pede ajuda |
| `EADDRINUSE :::3333` | Já há uma API aberta noutro terminal. Fecha-a ou muda `PORT` no `.env` |
| `CORS`/pedidos bloqueados no browser | `CORS_ORIGINS` não é exactamente o endereço do frontend (inclui porta, sem `/` no fim) |
| Login funciona mas `/users/me` dá 401 | Falta `credentials: 'include'` no `fetch` do frontend |
| `403 CSRF_REJECTED` | O pedido vem de uma origem que não está em `CORS_ORIGINS` |
| `429` ao testar muito | Rate limiting. Espera uns minutos ou usa `RATE_LIMIT_ENABLED=false` **apenas em desenvolvimento** |
| Utilizador do seed não consegue entrar | A senha do seed não é Argon2id. Cria o utilizador pela API |
| Bolsas "desaparecem" da lista | Por omissão só mostra **abertas** e **publicadas**. Usa `?state=all` ou publica a bolsa no admin |
| Mentor não aparece na lista pública | Só aparecem mentores **VERIFIED**: um admin tem de os aprovar (`POST /admin/mentors/:id/review`) |

Se algo falhar, copia a mensagem de erro **completa** (sem senhas) e envia-a.
