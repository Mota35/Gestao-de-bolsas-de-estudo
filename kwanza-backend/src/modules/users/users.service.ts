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
            academicPreferences: user.studentProfile.academicPreferences,
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

  async getPreferences(userId: string) {
    const p = await this.db.studentProfile.findUnique({ where: { userId }, select: { academicPreferences: true } });
    const stored = (p?.academicPreferences as Record<string, unknown> | null) ?? {};
    return {
      language: 'pt', notifyOpportunities: true, notifyDeadlines: true, notifyCourses: true,
      notifyOptional: false, allowSuggestions: true, ...Object.fromEntries(
        ['language', 'notifyOpportunities', 'notifyDeadlines', 'notifyCourses', 'notifyOptional', 'allowSuggestions']
          .filter((key) => stored[key] !== undefined).map((key) => [key, stored[key]]),
      ),
    };
  }

  async savePreferences(userId: string, preferences: Record<string, unknown>) {
    const existing = await this.db.studentProfile.findUnique({ where: { userId }, select: { academicPreferences: true } });
    const targetLevel = (existing?.academicPreferences as Record<string, unknown> | null)?.targetLevel;
    const value = { ...(targetLevel ? { targetLevel } : {}), ...preferences };
    await this.db.studentProfile.upsert({
      where: { userId }, create: { userId, academicPreferences: value },
      update: { academicPreferences: value },
    });
    return preferences;
  }

  async requestData(userId: string, kind: 'copia' | 'eliminacao') {
    return this.db.studentDataRequest.create({ data: { userId, kind } });
  }

  async recommendations(userId: string) {
    const profile = await this.db.studentProfile.findUnique({ where: { userId } });
    const rows = await this.db.scholarship.findMany({
      where: { publicationStatus: 'PUBLISHED', ...(profile?.destinationCountries.length ? { destinationCountry: { in: profile.destinationCountries } } : {}) },
      orderBy: [{ applicationDeadline: 'asc' }, { createdAt: 'desc' }], take: 6,
      include: { sourceLinks: { where: { status: 'ACTIVE' }, take: 1, include: { source: true } } },
    });
    return rows;
  }
}
