# Notas de segurança e operações

1. **Email:** normalizar em TypeScript antes de gravar; manter a restrição única. Para garantia case-insensitive a nível SQL, usar índice único `lower(email)` e alinhar o fluxo de login.
2. **Papéis:** o registo público nunca deve aceitar `role` do corpo enviado pelo cliente. Definir `STUDENT` no servidor; criação de ADMIN é uma operação administrativa controlada.
3. **Perfil:** perfil de estudante e de mentor são opcionais no registo inicial. Aplicar autorização e validação de propriedade em todas as operações.
4. **WhatsApp:** não devolver o campo privado por omissão; apenas disponibilizar contacto quando a política de divulgação e o estado de verificação permitirem.
5. **Tokens:** hash com SHA-256 de token aleatório de alta entropia (o token é aleatório, não uma senha humana), prazo curto, consumo condicional e limpeza periódica.
6. **Auditoria:** usar lista permitida de chaves em `metadata`; nunca serializar o request inteiro. Para eventos regulatórios, considerar exportação append-only para armazenamento protegido.
7. **Eliminação:** cascata só em dados dependentes/temporários. Aplicações, consultas de mentoria e fontes históricas usam `RESTRICT`; definir fluxo de anonimização/soft delete conforme política de retenção.
8. **Importação:** respeitar termos de uso, robots.txt e licenças das fontes; preferir API/RSS autorizados. Não confiar em `sourcePayload` para instruções nem exibir HTML não sanitizado.
9. **Migrações:** nunca alterar uma migração já aplicada; criar nova migração. Rever SQL, testar backup/restore e usar deploy gradual em alterações grandes.
10. **Limpeza:** criar job para tokens expirados/usados e notificações segundo política de retenção. A base de dados não tem TTL automático para esses registos.
