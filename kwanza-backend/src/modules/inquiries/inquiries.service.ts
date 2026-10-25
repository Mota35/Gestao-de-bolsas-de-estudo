import type { Db } from '../../db/prisma.js';
import type { InquiryStatus } from '../../types/enums.js';
import { conflict, forbidden, notFound } from '../../utils/errors.js';
import { pageArgs, pageMeta } from '../../utils/pagination.js';
import { publicWhatsapp } from '../mentors/mentors.service.js';

const OPEN_STATUSES: InquiryStatus[] = ['NEW', 'CONTACTED', 'IN_DISCUSSION', 'ACCEPTED'];

/**
 * Pedido de contacto de um estudante a um serviço de mentoria. O contacto efectivo ocorre por
 * WhatsApp (se o mentor o autorizou). Não há pagamento nem reserva automática: "ACCEPTED" apenas
 * regista que o mentor aceitou conversar/prestar o serviço.
 */
export class InquiriesService {
  constructor(private readonly db: Db) {}

  private dto(i: any, extra: Record<string, unknown> = {}) {
    return {
      id: i.id,
      mentorServiceId: i.mentorServiceId,
      message: i.message,
      status: i.status,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      ...extra,
    };
  }

  async create(studentUserId: string, input: { mentorServiceId: string; message?: string | null }) {
    const service = await this.db.mentorService.findFirst({
      where: {
        id: input.mentorServiceId,
        publicationStatus: 'PUBLISHED',
        mentorProfile: { verificationStatus: 'VERIFIED', user: { isActive: true } },
      },
      include: { mentorProfile: true },
    });
    if (!service) throw notFound('Serviço não encontrado.');

    const open = await this.db.mentorshipInquiry.findFirst({
      where: { studentUserId, mentorServiceId: service.id, status: { in: OPEN_STATUSES } },
      select: { id: true },
    });
    if (open) throw conflict('Já tem um pedido em curso para este serviço.');

    const inquiry = await this.db.mentorshipInquiry.create({
      data: { studentUserId, mentorServiceId: service.id, message: input.message ?? null },
    });
    return this.dto(inquiry, {
      whatsapp: publicWhatsapp(
        service.mentorProfile,
        `Olá! Tenho interesse no serviço "${service.title}" (Kwanza Oportunidades).`,
      ),
    });
  }

  async listMine(studentUserId: string, q: { page: number; pageSize: number; status?: InquiryStatus }) {
    const where = { studentUserId, ...(q.status ? { status: q.status } : {}) };
    const [total, rows] = await Promise.all([
      this.db.mentorshipInquiry.count({ where }),
      this.db.mentorshipInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { mentorService: { select: { id: true, title: true } } },
        ...pageArgs(q),
      }),
    ]);
    return { items: rows.map((r: any) => this.dto(r, { service: r.mentorService })), meta: pageMeta(q, total) };
  }

  async listReceived(mentorUserId: string, q: { page: number; pageSize: number; status?: InquiryStatus }) {
    const where = { mentorService: { mentorProfile: { userId: mentorUserId } }, ...(q.status ? { status: q.status } : {}) };
    const [total, rows] = await Promise.all([
      this.db.mentorshipInquiry.count({ where }),
      this.db.mentorshipInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        // minimização: o mentor vê apenas o nome do estudante
        include: { mentorService: { select: { id: true, title: true } }, student: { select: { name: true } } },
        ...pageArgs(q),
      }),
    ]);
    return {
      items: rows.map((r: any) => this.dto(r, { service: r.mentorService, studentName: r.student.name })),
      meta: pageMeta(q, total),
    };
  }

  async updateStatus(user: { id: string; role: string }, id: string, status: InquiryStatus) {
    const inquiry = await this.db.mentorshipInquiry.findUnique({
      where: { id },
      include: { mentorService: { include: { mentorProfile: { select: { userId: true } } } } },
    });
    if (!inquiry) throw notFound('Pedido não encontrado.');
    const isStudent = inquiry.studentUserId === user.id;
    const isMentor = inquiry.mentorService.mentorProfile.userId === user.id;
    if (!isStudent && !isMentor) throw notFound('Pedido não encontrado.'); // não revela existência
    if (isStudent && !isMentor && status !== 'CLOSED') throw forbidden('O estudante só pode encerrar o pedido.');

    const updated = await this.db.mentorshipInquiry.update({ where: { id }, data: { status } });
    return this.dto(updated);
  }
}
