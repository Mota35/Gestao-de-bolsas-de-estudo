import { PrismaClient, UserRole, ScholarshipPublicationStatus, VerificationStatus,
  ScholarshipSourceType, CollectionMethod, IntegrationStatus, DeliveryMode,
  ServiceCategory, ServicePublicationStatus, CoursePublicationStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 12) {
    throw new Error("Defina SEED_DEMO_PASSWORD com pelo menos 12 caracteres antes de executar o seed.");
  }
  const passwordHash = await hash(demoPassword, 12);

  const student = await prisma.user.upsert({
    where: { email: "demo.student@example.test" },
    update: {},
    create: {
      name: "Estudante Demonstração",
      email: "demo.student@example.test",
      passwordHash,
      role: UserRole.STUDENT,
      emailVerifiedAt: new Date(),
      studentProfile: { create: {
        nationalityCountry: "Angola",
        academicLevel: "Licenciatura",
        institution: "Instituição fictícia de demonstração",
        fieldOfStudy: "Tecnologias de Informação",
        destinationCountries: ["Portugal", "Brasil"],
        languages: ["Português", "Inglês"],
        academicPreferences: { demoData: true, note: "Dados fictícios de desenvolvimento" }
      } }
    }
  });

  const mentor = await prisma.user.upsert({
    where: { email: "demo.mentor@example.test" },
    update: {},
    create: {
      name: "Mentor Demonstração",
      email: "demo.mentor@example.test",
      passwordHash,
      role: UserRole.MENTOR,
      emailVerifiedAt: new Date(),
      mentorProfile: { create: {
        bio: "Perfil fictício usado apenas para demonstração.",
        specialties: ["Preparação de candidatura"],
        qualifications: ["Qualificação fictícia de demonstração"],
        experienceYears: 2,
        languages: ["Português"],
        allowWhatsappPublic: false,
        verificationStatus: "VERIFIED"
      } }
    },
    include: { mentorProfile: true }
  });

  const source = await prisma.scholarshipSource.upsert({
    where: { id: "00000000-0000-4000-8000-000000000101" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000101",
      name: "Fonte Oficial Fictícia — Demonstração",
      officialUrl: "https://example.test/bolsas",
      domain: "example.test",
      sourceType: ScholarshipSourceType.OTHER,
      collectionMethod: CollectionMethod.MANUAL,
      integrationStatus: IntegrationStatus.DISABLED
    }
  });

  const scholarship = await prisma.scholarship.upsert({
    where: { slug: "bolsa-demonstracao-kwanza" },
    update: {},
    create: {
      title: "Bolsa de Demonstração Kwanza",
      slug: "bolsa-demonstracao-kwanza",
      description: "Oportunidade totalmente fictícia para testar a interface e os filtros. Não é uma bolsa real.",
      sponsoringInstitution: "Instituição Fictícia de Demonstração",
      institutionCountry: "Angola",
      destinationCountry: "Portugal",
      educationLevel: ["Licenciatura"],
      studyAreas: ["Tecnologias de Informação"],
      fundingType: "Integral (fictício)",
      eligibilityCriteria: "Dados de exemplo; não usar para candidaturas reais.",
      requiredDocuments: ["Documento fictício de exemplo"],
      openingDate: new Date("2026-01-01T00:00:00Z"),
      applicationDeadline: new Date("2027-12-31T00:00:00Z"),
      officialUrl: "https://example.test/bolsas/demo",
      externalId: "DEMO-KO-001",
      publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
      verificationStatus: VerificationStatus.VERIFIED,
      verifiedById: null,
      verifiedAt: new Date(),
      sourceLastCheckedAt: new Date(),
      sourceLinks: { create: {
        sourceId: source.id,
        sourceUrl: "https://example.test/bolsas/demo",
        externalId: "DEMO-KO-001",
        importedAt: new Date(),
        lastSeenAt: new Date(),
        sourcePayload: { demoData: true }
      } }
    }
  });

  await prisma.mentorService.upsert({
    where: { mentorProfileId_slug: { mentorProfileId: mentor.mentorProfile!.id, slug: "orientacao-demo" } },
    update: {},
    create: {
      mentorProfileId: mentor.mentorProfile!.id,
      title: "Orientação de candidatura (demo)",
      slug: "orientacao-demo",
      description: "Serviço fictício para testar listagens. Não representa uma oferta real.",
      category: ServiceCategory.APPLICATION_SUPPORT,
      price: "0.00",
      currency: "AOA",
      durationMinutes: 30,
      mode: DeliveryMode.ONLINE,
      publicationStatus: ServicePublicationStatus.PUBLISHED
    }
  });

  await prisma.course.upsert({
    where: { id: "00000000-0000-4000-8000-000000000202" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000202",
      mentorProfileId: mentor.mentorProfile!.id,
      title: "Curso de Demonstração",
      description: "Curso fictício para dados de desenvolvimento.",
      category: "Desenvolvimento académico",
      price: "0.00",
      currency: "AOA",
      durationMinutes: 60,
      mode: DeliveryMode.ONLINE,
      enrollmentUrl: "https://example.test/curso-demo",
      publicationStatus: CoursePublicationStatus.PUBLISHED
    }
  });

  await prisma.scholarshipFavorite.upsert({
    where: { userId_scholarshipId: { userId: student.id, scholarshipId: scholarship.id } },
    update: {},
    create: { userId: student.id, scholarshipId: scholarship.id }
  });

  console.log("Seed de demonstração concluído. Todos os registos usam endereços/domínios example.test.");
}

main().catch((error) => { console.error(error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
