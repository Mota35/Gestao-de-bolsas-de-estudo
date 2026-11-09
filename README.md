# Kwanza Oportunidades

Plataforma para descobrir e gerir bolsas de estudo, cursos e mentorias. O sistema inclui uma área pública, contas para estudantes e mentores, e ferramentas de administração. O contacto entre estudantes e mentores pode ser feito por WhatsApp. A aplicação não processa pagamentos nem faz candidaturas automaticamente.

## Como o projeto está organizado

```text
frontend/                Aplicação web em React, TypeScript e Vite
kwanza-backend/          API REST em Node.js, Express, TypeScript e Prisma
  prisma/                Schema, migrações e seed da base de dados
  src/                   Rotas, módulos e lógica da API
  docker-compose.yml     PostgreSQL local para desenvolvimento
kwanza-oportunidades-db/ Pacote de schema e documentação da base de dados
```

O frontend corre em `http://localhost:5173` e encaminha pedidos `/api` para a API em `http://localhost:3333`. O backend usa PostgreSQL para guardar utilizadores e restantes dados.

## Requisitos

- Git
- Node.js 20 ou superior (inclui npm)
- Docker Desktop com Docker Compose, para iniciar PostgreSQL localmente

Confirma as instalações num terminal:

```powershell
node -v
npm -v
git --version
docker --version
```

## Clonar e executar no Windows

### 1. Clonar o repositório

No PowerShell, substitui o endereço pelo URL real do repositório:

```powershell
git clone <URL-DO-REPOSITORIO>
cd Gestao-de-bolsas-de-estudo
```

### 2. Iniciar PostgreSQL

```powershell
cd kwanza-backend
docker compose up -d db
```

O Docker Compose cria uma base local `kwanza`, com utilizador `kwanza` e senha de desenvolvimento `kwanza_dev`.

### 3. Configurar e iniciar a API

Na pasta `kwanza-backend`, cria o ficheiro de ambiente:

```powershell
Copy-Item .env.example .env
```

Abre `.env` e verifica a ligação local à base de dados:

```env
DATABASE_URL=postgresql://kwanza:kwanza_dev@localhost:5432/kwanza?schema=public
```

Define também um `JWT_SECRET` longo e aleatório. Depois instala as dependências e prepara a base de dados:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Mantém este terminal aberto. A API fica em `http://localhost:3333`.

### 4. Configurar e iniciar o frontend

Abre um segundo terminal na raiz do projeto e executa:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Abre `http://localhost:5173` no navegador. O frontend está configurado para encaminhar as chamadas `/api` para o backend local.

## Uma base de dados partilhada entre computadores

Para todos os clones verem os mesmos utilizadores e alterações em tempo real, todos têm de ligar a API à **mesma base PostgreSQL alojada online**. Uma base Docker em `localhost` é exclusiva daquele computador e não sincroniza com as outras. O projeto já obtém a ligação pela variável `DATABASE_URL` do backend.

1. Cria uma base PostgreSQL num serviço de alojamento que aceite ligações dos computadores da equipa. Restringe os acessos ao necessário e usa TLS/SSL se o fornecedor o disponibilizar. Não uses as credenciais de desenvolvimento `kwanza_dev` na base online.
2. No computador principal, configura `kwanza-backend/.env` com a URL de ligação fornecida pelo alojamento:

   ```env
   DATABASE_URL="postgresql://UTILIZADOR:SENHA@HOST:5432/NOME_DA_BASE?schema=public&sslmode=require"
   ```

   Usa os parâmetros SSL exigidos pelo fornecedor. Se a senha tiver caracteres especiais, codifica-os para URL. Nunca coloques esta URL no frontend, no Git ou numa mensagem pública.
3. Aplica as migrações à base partilhada uma vez, a partir de `kwanza-backend`:

   ```powershell
   npm install
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Para copiar os utilizadores e dados que já existem na base local para a base online pela primeira vez, instala as ferramentas PostgreSQL e cria um backup só dos dados (ajusta as credenciais locais se forem diferentes):

   ```powershell
   pg_dump -h localhost -p 5432 -U kwanza -d kwanza --data-only -F c -f kwanza-dados.backup
   ```

   Restaura-o na base online já migrada. Substitui os valores pelos dados de ligação do alojamento:

   ```powershell
   pg_restore -h HOST -p 5432 -U UTILIZADOR -d NOME_DA_BASE --data-only --no-owner kwanza-dados.backup
   ```

   Se a base online já tiver dados, não faças esta importação sem planear a junção: podem existir IDs ou emails repetidos. Guarda o backup num local privado e apaga-o quando já não for necessário; contém dados pessoais e hashes de senhas.
5. Cada pessoa clona o repositório, cria o seu `kwanza-backend/.env` local e coloca nele a **mesma `DATABASE_URL` online**. Em vez de iniciar o PostgreSQL local do Docker, instala dependências, executa `npx prisma migrate deploy` para garantir que a versão do schema está atualizada e inicia `npm run dev`. Cada pessoa executa o frontend normalmente em `frontend` com `npm run dev`.

Assim, os novos registos e alterações ficam na base central e são vistos pelas outras instalações. Partilha a URL da base por um gestor de segredos ou canal privado; qualquer pessoa com essa credencial pode aceder aos dados. Mantém backups regulares. Não executes `prisma migrate dev` em produção nem alteres os dados diretamente sem backup.

## Primeiro administrador

O registo público não cria contas de administrador. Para provisionar uma no computador local, abre outro terminal em `kwanza-backend` e executa:

```powershell
$env:ADMIN_EMAIL="admin@exemplo.ao"
$env:ADMIN_NAME="Admin"
npm run admin:create
```

O comando pede a senha. Substitui o email e o nome pelos valores desejados.

## Notas

- Os ficheiros `.env` são locais e não devem ser enviados para o Git. Cada computador deve criá-los a partir do `.env.example`.
- Em `NODE_ENV=development`, o registo não envia email de confirmação: o próprio mentor pode confirmar o endereço pelo botão **Confirmar email** no painel. Esta confirmação manual só funciona em desenvolvimento; em produção, o backend envia o link de confirmação.
- O email usa uma caixa de saída local por omissão; para enviar emails reais, é necessário configurar um serviço SMTP ou Resend no `.env` do backend.
- `kwanza-oportunidades-db/` contém documentação e um pacote de base de dados separado; para executar a aplicação, segue os comandos do backend em `kwanza-backend/`.
- A base PostgreSQL do Compose é para desenvolvimento local. Para publicação online, configura serviços, segredos, HTTPS e backups adequados ao ambiente de produção.
