export interface FaqTopic {
  id: string
  title: string
  items: Array<{ q: string; a: string }>
}

export const faqTopics: FaqTopic[] = [
  {
    id: 'bolsas',
    title: 'Bolsas e candidaturas',
    items: [
      {
        q: 'Como me candidato a uma bolsa?',
        a: 'Consulta os requisitos e o prazo. A candidatura é feita no site oficial da instituição, nunca através de envio de documentos à Kwanza.',
      },
      { q: 'Posso candidatar-me a uma bolsa expirada?', a: 'Não uses um prazo passado como indicação de candidatura aberta. Procura uma nova edição no portal oficial.' },
    ],
  },
  {
    id: 'fontes',
    title: 'Fontes e verificação',
    items: [
      {
        q: 'O que significa “verificada”?',
        a: 'Indica uma revisão da fonte ou do perfil pela plataforma. Não garante uma bolsa, a qualidade de um serviço ou uma decisão favorável. Neste design, os estados são exemplos.',
      },
      { q: 'Qual é a diferença entre pendente e aberta?', a: 'Pendente refere-se à verificação. Aberta refere-se ao período de candidatura. São estados independentes.' },
    ],
  },
  {
    id: 'custos',
    title: 'Custos de cursos e mentorias',
    items: [
      { q: 'Procurar bolsas tem algum custo?', a: 'Não. As mentorias e os cursos podem ser pagos, com valores em Kz/AOA indicados pelo profissional.' },
      { q: 'Pagar uma mentoria garante uma bolsa?', a: 'Não. A decisão é sempre da instituição. Confirma as condições e evita promessas de aprovação garantida.' },
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança e conta',
    items: [
      {
        q: 'Porque não vejo o WhatsApp de todos os mentores?',
        a: 'O contacto só é divulgado com autorização explícita do mentor. Nunca mostramos um número pessoal sem consentimento.',
      },
      {
        q: 'Como recupero a minha senha?',
        a: 'Usa “Recuperar senha”. O backend deverá validar o pedido e enviar instruções, se existir uma conta. Este protótipo não envia emails.',
      },
      {
        q: 'Tenho de carregar documentos pessoais?',
        a: 'Não. O registo e o perfil recolhem apenas dados mínimos. Os documentos de candidatura são entregues à instituição nos canais oficiais.',
      },
    ],
  },
]
