import { z } from 'zod';
import { passwordPolicyIssues } from '../../utils/password.js';

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(320)
  .pipe(z.email({ message: 'Email inválido.' }));

const nameField = z.string().trim().min(2, 'Nome demasiado curto.').max(120);

export const passwordField = z.string().min(1).max(128);

/** Aplica a política de senhas (com acesso opcional ao email para detectar senhas óbvias). */
function withPolicy<T extends z.ZodTypeAny>(schema: T, passwordKey: string) {
  return schema.superRefine((val: unknown, ctx) => {
    const v = val as Record<string, string>;
    const issues = passwordPolicyIssues(v[passwordKey] ?? '', v.email);
    for (const message of issues) ctx.addIssue({ code: 'custom', path: [passwordKey], message });
  });
}

export const registerStudentSchema = withPolicy(
  z.object({ name: nameField, email: emailField, password: passwordField }).strict(),
  'password',
);

export const registerMentorSchema = withPolicy(
  z
    .object({
      name: nameField,
      email: emailField,
      password: passwordField,
      bio: z.string().trim().max(4000).optional(),
      specialties: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
    })
    .strict(),
  'password',
);

export const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(128) }).strict();

export const forgotPasswordSchema = z.object({ email: emailField }).strict();

export const resetPasswordSchema = withPolicy(
  z.object({ token: z.string().min(20).max(200), newPassword: passwordField }).strict(),
  'newPassword',
);

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) }).strict();

export const changePasswordSchema = withPolicy(
  z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordField }).strict(),
  'newPassword',
);

export const sessionIdParams = z.object({ id: z.uuid() });
