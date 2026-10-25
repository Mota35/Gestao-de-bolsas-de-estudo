import type { Db, Tx } from '../../db/prisma.js';
import { forbidden, notFound } from '../../utils/errors.js';
import { toPublicUser } from '../auth/auth.service.js';

export class UsersService {
  constructor(private readonly db: Db) {}

  async getMe(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, mentorProfile: { select: { id: true, verificationStatus: true } } },
    });
    if (!user) throw notFound('Utilizador não encontrado.');
    return {
      ...toPublicUser(user),
      studentProfile: user.studentProfile
        ? {
            nationalityCountry: user.studentProfile.nationalityCountry,
            academicLevel: user.studentProfile.academicLevel,
            institution: user.studentProfile.institution,
            fieldOfStudy: user.studentProfile.fieldOfStudy,
            destinationCountries: user.studentProfile.destinationCountries,
            languages: user.studentProfile.languages,
          }
        : null,
      mentorProfile: user.mentorProfile
        ? { id: user.mentorProfile.id, verificationStatus: user.mentorProfile.verificationStatus }
        : null,
    };
  }

  /** O utilizador só pode actualizar o próprio perfil: o id vem sempre da sessão, nunca do cliente. */
  async updateMe(
    userId: string,
    input: { name?: string; studentProfile?: Record<string, unknown> },
    role: string,
  ) {
    if (input.studentProfile && role !== 'STUDENT') {
      throw forbidden('Apenas estudantes têm perfil de estudante.');
    }
    await this.db.$transaction(async (tx: Tx) => {
      if (input.name) await tx.user.update({ where: { id: userId }, data: { name: input.name } });
      if (input.studentProfile) {
        await tx.studentProfile.upsert({
          where: { userId },
          create: { userId, ...input.studentProfile },
          update: input.studentProfile,
        });
      }
    });
    return this.getMe(userId);
  }
}
