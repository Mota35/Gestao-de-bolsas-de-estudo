import { z } from 'zod'

const email = z.string().trim().min(1, 'Indica o teu email.').email('Indica um email válido.')
const password = z
  .string()
  .min(12, 'Usa pelo menos 12 caracteres.')
  .regex(/[A-Za-zÀ-ÿ]/, 'Inclui pelo menos uma letra.')
  .regex(/\d/, 'Inclui pelo menos um número.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Indica a tua senha.'),
})

export const registerSchema = z
  .object({
    role: z.enum(['estudante', 'mentor']),
    name: z.string().trim().min(2, 'Indica o teu nome.'),
    email,
    password,
    confirm: z.string().min(1, 'Confirma a senha.'),
    terms: z.boolean().refine((v) => v, 'Tens de aceitar os Termos e a Política de privacidade.'),
    newsletter: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'As senhas devem coincidir.' })

export const forgotSchema = z.object({ email })

export const resetSchema = z
  .object({ password, confirm: z.string().min(1, 'Confirma a nova senha.') })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'As senhas ainda não coincidem.' })

export const supportSchema = z.object({
  name: z.string().trim().min(2, 'Indica o teu nome.'),
  email,
  category: z.string().min(1, 'Seleciona uma categoria.'),
  subject: z.string().trim().min(3, 'Resume a tua questão.'),
  message: z.string().trim().min(10, 'Descreve a situação com mais detalhe.'),
  consent: z.boolean().refine((v) => v, 'Precisamos da tua autorização para tratar os dados.'),
})

export const studentProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Indica o nome de apresentação.'),
  nationality: z.string().min(1, 'Indica a nacionalidade.'),
  academicLevel: z.string().min(1, 'Indica o nível académico.'),
  area: z.string().min(1, 'Indica a área de estudo.'),
  targetLevel: z.string().min(1, 'Indica o nível que procuras.'),
  targetCountry: z.string().min(1, 'Indica o país pretendido.'),
})

export const mentorProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Indica o nome profissional.'),
    title: z.string().trim().min(3, 'Indica o título profissional.'),
    bio: z.string().trim().min(20, 'Escreve uma biografia com pelo menos 20 caracteres.'),
    specialties: z.string().trim().min(2, 'Indica pelo menos uma especialidade.'),
    experience: z.string().trim().min(5, 'Descreve a tua experiência.'),
    languages: z.string().min(1),
    modalities: z.string().min(1),
    place: z.string(),
    whatsapp: z.string(),
    whatsappConsent: z.boolean(),
    confirmTruth: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const digits = d.whatsapp.replace(/\D/g, '')
    if (d.whatsapp && (digits.length < 11 || digits.length > 15)) {
      ctx.addIssue({ code: 'custom', path: ['whatsapp'], message: 'Usa o formato internacional, só dígitos (ex.: 244 + número).' })
    }
    if (d.whatsappConsent && !d.whatsapp) {
      ctx.addIssue({ code: 'custom', path: ['whatsapp'], message: 'Indica o número para autorizar a divulgação.' })
    }
  })

export const serviceSchema = z.object({
  title: z.string().trim().min(3, 'Indica o título do serviço.'),
  description: z.string().trim().min(10, 'Descreve o serviço.'),
  specialty: z.string().min(1),
  kind: z.enum(['mentoria', 'curso']),
  price: z.coerce.number({ invalid_type_error: 'Indica um preço.' }).positive('O preço tem de ser superior a zero.'),
  currency: z.literal('AOA'),
  duration: z.string().trim().min(1, 'Indica a duração.'),
  modality: z.enum(['online', 'presencial']),
  place: z.string(),
  availability: z.string(),
  conditions: z.string(),
  state: z.enum(['rascunho', 'publicado', 'desactivado']),
  showWhatsApp: z.boolean(),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type ForgotForm = z.infer<typeof forgotSchema>
export type ResetForm = z.infer<typeof resetSchema>
export type SupportForm = z.infer<typeof supportSchema>
export type StudentProfileForm = z.infer<typeof studentProfileSchema>
export type MentorProfileForm = z.infer<typeof mentorProfileSchema>
export type ServiceForm = z.infer<typeof serviceSchema>
