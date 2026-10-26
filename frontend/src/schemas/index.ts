import { z } from 'zod'

const password = z
  .string()
  .min(10, 'A senha deve ter pelo menos 10 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter letras.')
  .regex(/\d/, 'A senha deve conter números.')

export const loginSchema = z.object({
  email: z.string().min(1, 'Indique o email.').email('Email inválido.'),
  password: z.string().min(1, 'Indique a senha.'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Indique o nome completo.'),
    email: z.string().min(1, 'Indique o email.').email('Email inválido.'),
    password,
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
    role: z.enum(['student', 'mentor']),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Deve aceitar os termos.' }) }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })
  .superRefine((v, ctx) => {
    const common = ['password', 'password1', '123456789', '1234567890', 'qwertyuiop', 'iloveyou12', 'senha12345', 'angola1234', 'luanda1234', 'admin12345', 'letmein123']
    if (common.includes(v.password.toLowerCase())) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Escolha uma senha menos comum.' })
    }
    const emailName = v.email.split('@')[0]?.toLowerCase() ?? ''
    if (emailName.length >= 4 && v.password.toLowerCase().includes(emailName)) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'A senha não deve conter o início do seu email.' })
    }
  })
export type RegisterInput = z.infer<typeof registerSchema>

export const forgotSchema = z.object({
  email: z.string().min(1, 'Indique o email.').email('Email inválido.'),
})
export type ForgotInput = z.infer<typeof forgotSchema>

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string().min(1, 'Confirme a senha.') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const contactSchema = z.object({
  name: z.string().min(2, 'Indique o nome.'),
  email: z.string().email('Email inválido.'),
  subject: z.string().min(3, 'Indique o assunto.'),
  message: z.string().min(10, 'A mensagem deve ter pelo menos 10 caracteres.'),
})
export type ContactInput = z.infer<typeof contactSchema>

export const studentProfileSchema = z.object({
  nationality: z.string().min(2, 'Indique a nacionalidade.'),
  educationLevel: z.enum(['', 'bachelor', 'master', 'phd', 'technical', 'other']),
  fieldOfStudy: z.string().max(100),
  targetCountry: z.string().max(80),
  phone: z
    .string()
    .regex(/^[0-9+\s-]*$/, 'Use apenas números, espaços e +.')
    .optional(),
  notifyDeadlines: z.boolean(),
})
export type StudentProfileInput = z.infer<typeof studentProfileSchema>

export const mentorProfileSchema = z.object({
  headline: z.string().min(5, 'Indique um título profissional.').max(120),
  bio: z.string().min(30, 'A biografia deve ter pelo menos 30 caracteres.').max(2000),
  specialties: z.string().min(2, 'Indique pelo menos uma especialidade (separe por vírgulas).'),
  experience: z.string().min(10, 'Descreva a sua experiência.'),
  qualifications: z.string().min(2, 'Indique as qualificações (separe por vírgulas).'),
  languages: z.string().min(2, 'Indique os idiomas (separe por vírgulas).'),
  whatsapp: z
    .string()
    .min(1, 'Indique o número de WhatsApp.')
    .refine((v) => /^\+?[0-9\s-]{9,18}$/.test(v), 'Número inválido. Exemplo: +244 923 000 000'),
  whatsappPublic: z.boolean(),
  photoUrl: z.string().url('URL inválido.').optional().or(z.literal('')),
})
export type MentorProfileFormInput = z.infer<typeof mentorProfileSchema>

export const serviceSchema = z.object({
  title: z.string().min(5, 'O título deve ter pelo menos 5 caracteres.').max(120),
  description: z.string().min(20, 'A descrição deve ter pelo menos 20 caracteres.').max(2000),
  kind: z.enum(['course', 'mentoring']),
  price: z.coerce.number({ invalid_type_error: 'Indique o preço.' }).min(0, 'O preço não pode ser negativo.'),
  currency: z.enum(['AOA', 'USD', 'EUR']),
  mode: z.enum(['online', 'presential']),
  availability: z.string().min(3, 'Indique a disponibilidade.'),
  published: z.boolean(),
})
export type ServiceFormInput = z.infer<typeof serviceSchema>

export const scholarshipAdminSchema = z.object({
  title: z.string().min(5, 'Indique o título.'),
  institution: z.string().min(2, 'Indique a instituição.'),
  country: z.string().min(2, 'Indique o país.'),
  level: z.enum(['bachelor', 'master', 'phd', 'technical', 'other']),
  field: z.string().min(2, 'Indique a área de estudo.'),
  funding: z.enum(['full', 'partial', 'other']),
  modality: z.enum(['presential', 'online', 'hybrid']),
  deadline: z.string().optional().or(z.literal('')),
  sourceName: z.string().min(2, 'Indique a fonte.'),
  sourceUrl: z.string().url('URL inválido.').optional().or(z.literal('')),
  applicationUrl: z.string().url('URL inválido.').optional().or(z.literal('')),
  description: z.string().min(20, 'Descreva a oportunidade.'),
})
export type ScholarshipAdminInput = z.infer<typeof scholarshipAdminSchema>
