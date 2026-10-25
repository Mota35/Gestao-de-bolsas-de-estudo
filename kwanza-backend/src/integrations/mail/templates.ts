const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function passwordResetEmail(name: string, link: string, ttlMinutes: number) {
  return {
    subject: 'Recuperação de senha - Kwanza Oportunidades',
    text:
      `Olá ${name},\n\nRecebemos um pedido para redefinir a sua senha. ` +
      `Abra o link abaixo (válido por ${ttlMinutes} minutos, uso único):\n\n${link}\n\n` +
      `Se não fez este pedido, ignore esta mensagem. A sua senha actual continua válida.`,
    html:
      `<p>Olá ${esc(name)},</p><p>Recebemos um pedido para redefinir a sua senha. ` +
      `O link é válido por ${ttlMinutes} minutos e só pode ser usado uma vez:</p>` +
      `<p><a href="${esc(link)}">Redefinir senha</a></p>` +
      `<p>Se não fez este pedido, ignore esta mensagem.</p>`,
  };
}

export function emailVerificationEmail(name: string, link: string, ttlHours: number) {
  return {
    subject: 'Confirme o seu email - Kwanza Oportunidades',
    text: `Olá ${name},\n\nConfirme o seu email através do link (válido por ${ttlHours} horas):\n\n${link}\n`,
    html:
      `<p>Olá ${esc(name)},</p><p>Confirme o seu email (válido por ${ttlHours} horas):</p>` +
      `<p><a href="${esc(link)}">Confirmar email</a></p>`,
  };
}

export function passwordChangedEmail(name: string) {
  return {
    subject: 'A sua senha foi alterada - Kwanza Oportunidades',
    text: `Olá ${name},\n\nA senha da sua conta foi alterada e as sessões anteriores foram terminadas. Se não foi você, recupere a conta imediatamente.`,
  };
}
