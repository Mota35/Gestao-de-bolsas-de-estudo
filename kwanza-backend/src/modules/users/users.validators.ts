import { z } from 'zod';

const list = (max: number, itemMax: number) =>
  z.array(z.string().trim().min(1).max(itemMax)).max(max);

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    // Apenas para estudantes
    studentProfile: z
      .object({
        nationalityCountry: z.string().trim().max(100).nullable().optional(),
        academicLevel: z.string().trim().max(100).nullable().optional(),
        institution: z.string().trim().max(180).nullable().optional(),
        fieldOfStudy: z.string().trim().max(160).nullable().optional(),
        destinationCountries: list(20, 100).optional(),
        languages: list(20, 60).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.studentProfile !== undefined, {
    message: 'Indique pelo menos um campo para actualizar.',
  });
