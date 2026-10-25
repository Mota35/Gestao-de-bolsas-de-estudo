# Kwanza Oportunidades — base de dados

Estrutura PostgreSQL para backend Node.js + Express + TypeScript + Prisma. Inclui schema, migração inicial, seed fictício e diagrama ER.

## Decisões importantes

- UUIDs para chaves primárias e `Decimal(12,2)` para preços.
- `User.email` deve ser normalizado pela aplicação (`trim().toLowerCase()`) antes de inserir. A restrição única impede duplicados exactos, mas não substitui normalização; numa migração futura, pode usar-se índice único sobre `lower(email)` com SQL customizado.
- Publicação, verificação e prazo são dimensões separadas. `ScholarshipValidityStatus` está preparado como enum, mas a validade temporal é preferencialmente calculada a partir de `openingDate`/`applicationDeadline` no momento da consulta para não ficar desactualizada. Não é um campo persistido.
- A migração acrescenta restrições SQL de preço, duração, experiência e coerência entre datas.
- `ScholarshipSourceLink` modela N:N entre bolsas e fontes, mantendo URL de origem e metadados de importação.
- Contacto WhatsApp só deve ser devolvido pela API se `allowWhatsappPublic = true`; aplicar autorização também no backend.
- Tokens só armazenam hashes. Gerar tokens aleatórios criptograficamente seguros, enviar o valor original uma única vez e persistir apenas o hash.
- `AuditLog` não deve ser apagado em cascata; `actorUserId` passa a NULL se a conta do actor for removida. Evite guardar IP em claro, tokens, dados de documentos ou conteúdo secreto em `metadata`.
- `Application` acompanha o progresso do estudante. `SUBMITTED_EXTERNALLY` só deve ser definido depois de o estudante confirmar a submissão no portal externo; abrir um URL não significa que a candidatura foi submetida.
- Os modelos `Course` e `MentorService` não implicam pagamento processado nem reserva de sessão. Para pagamentos reais, adicionar futuramente `Order/Payment` com referência do fornecedor, estado e idempotência; nunca armazenar dados de cartão.
- Os campos de array são adequados para listas simples sem atributos próprios. Se as áreas/idiomas precisarem de vocabulário controlado, traduções ou metadados, migrar para tabelas de catálogo e junção.
- A migração é fornecida manualmente e deve ser validada numa base de dados descartável antes de produção. Compare-a com `prisma migrate diff`/`migrate dev` na versão de Prisma adoptada.

## Requisitos

- Node.js LTS
- PostgreSQL 15+
- npm

## Instalação local

1. Crie uma base de dados e um utilizador PostgreSQL dedicados, com privilégios apenas sobre a base de dados da aplicação.
2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`. Nunca versione `.env`.
3. Instale dependências:

   ```bash
   npm install
   ```

4. Valide e formate o schema:

   ```bash
   npx prisma validate
   npx prisma format
   ```

5. Para uma base de desenvolvimento vazia, o caminho recomendado é:

   ```bash
   npx prisma migrate dev --name init
   ```

   Como este pacote inclui uma migração inicial SQL manual, primeiro teste-a numa base descartável. Se o Prisma indicar divergência entre schema e migração, gere uma migração corrigida com `prisma migrate dev` num ambiente de desenvolvimento, inspeccione o SQL gerado e versione ambos os ficheiros. Nunca use `migrate reset` em dados que queira preservar.

6. Gere o cliente:

   ```bash
   npx prisma generate
   ```

7. Seed opcional, apenas em desenvolvimento:

   ```bash
   # Defina SEED_DEMO_PASSWORD com pelo menos 12 caracteres em .env
   npx prisma db seed
   ```

Os emails usam o domínio reservado `example.test`; a bolsa, mentor, curso e fonte são explicitamente fictícios.

## Produção

- Configure `DATABASE_URL` via gestor de segredos do ambiente, não via ficheiro versionado.
- No pipeline de deploy, execute `npx prisma migrate deploy` e `npx prisma generate`.
- Não execute `prisma db push` nem `migrate reset` em produção.
- Faça backup testado e plano de rollback antes de cada migração destrutiva.
- Execute o deploy com um utilizador que tenha apenas os privilégios necessários. Use outro utilizador para migrações, se a política operacional o exigir.
- Defina retenção/limpeza periódica para tokens expirados e notificações antigas; a limpeza de tokens pode apagar apenas tokens usados/expirados após o prazo de auditoria aplicável.
- Considere Row-Level Security se houver acesso directo ao PostgreSQL fora da API. Prisma não configura RLS automaticamente.
- Restrinja o acesso administrativo por RBAC na API; o enum `role` sozinho não implementa autorização.

## Consumo único e atómico de token

Nunca valide e consuma um token em duas operações separadas. Calcule o hash do token apresentado e faça uma actualização condicional numa transacção; só o pedido que actualizar uma linha pode prosseguir:

```ts
const now = new Date();
const result = await prisma.passwordResetToken.updateMany({
  where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
  data: { usedAt: now },
});
if (result.count !== 1) throw new Error("Token inválido, expirado ou já utilizado");

// Na MESMA transacção, actualize a password e invalide outros tokens activos.
```

Na prática, faça a alteração da senha e o consumo do token na mesma `prisma.$transaction`, para que não haja consumo sem actualização de senha nem reutilização concorrente. Use estratégia equivalente para `EmailVerificationToken`. Para rotação de refresh token, revogue o token anterior e crie o novo na mesma transacção.

## Pesquisa e desempenho

- Índices B-tree cobrem filtros estruturados e ordenação por prazo.
- Para pesquisa textual em português, considere `tsvector`/GIN com configuração `portuguese`, ou `pg_trgm` para correspondência parcial. Isso requer migração SQL customizada e consulta SQL/Prisma raw parametrizada; não adicionei extensão obrigatória para manter instalação simples.
- Índices compostos devem acompanhar consultas reais e `EXPLAIN (ANALYZE, BUFFERS)`. Evite indexar cada campo indiscriminadamente.
- `externalId` não é globalmente único porque diferentes fontes podem reutilizar identificadores; a deduplicação por fonte pode ser reforçada com índice único parcial em `scholarship_source_links(sourceId, externalId)` quando `externalId IS NOT NULL`, após confirmar a regra de negócio.

## Explicação das tabelas

- `users`: credenciais, papel, estado e verificação de email.
- `student_profiles`: dados académicos opcionais, preenchidos progressivamente.
- `mentor_profiles`: perfil profissional, verificação e controlo de divulgação do WhatsApp.
- `scholarships`: oportunidade e os seus estados independentes de publicação/verificação.
- `scholarship_sources`: fontes e estado de integração/recolha.
- `scholarship_source_links`: relação N:N entre oportunidades e fontes, com URL e histórico básico de importação.
- `scholarship_favorites`: favoritos, com unicidade por estudante/oportunidade.
- `mentor_services`: serviços de mentoria pagos ou gratuitos, sem presumir transacção financeira.
- `courses`: cursos publicados por mentores.
- `mentorship_inquiries`: pedido de contacto; não é reserva nem prova de pagamento.
- `password_reset_tokens`, `email_verification_tokens`: hashes de tokens, expiração e consumo.
- `refresh_tokens`: hashes de refresh tokens e revogação.
- `notifications`: notificações lidas/não lidas.
- `audit_logs`: trilho de acções relevantes, preservado sem cascata.
- `applications`: acompanhamento de candidatura, distinguindo estado de submissão externa.

## Limites de validação

A execução desta entrega não prova compatibilidade com a versão exacta de PostgreSQL/Prisma do ambiente de produção. Valide `prisma validate`, geração do cliente e migração contra a versão que o backend fixar no `package-lock.json`. O schema e SQL devem evoluir juntos em migrações versionadas.
