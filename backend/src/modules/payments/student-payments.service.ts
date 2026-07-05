import { Injectable, NotFoundException } from '@nestjs/common';
import { Payment, Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { QueryStudentPaymentDto } from './dto/query-student-payment.dto';

/** Include shape shared by both endpoints — student/group/branch summaries. */
const PAYMENT_INCLUDE = {
  student: { select: { id: true, firstName: true, lastName: true } },
  group: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
} satisfies Prisma.PaymentInclude;

/**
 * Student subscription payments — ad-hoc PAID payments recorded on demand.
 *
 * Separate from the FOUNDER-only monthly billing in the finance module: these
 * carry no billing month and are always created already PAID. FOUNDER + ADMIN
 * (guarded at the controller).
 */
@Injectable()
export class StudentPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a PAID subscription payment for a student.
   *
   * Resolves the student's branch and their single ACTIVE group membership
   * (GroupStudent.leftAt = null) as the (nullable) groupId. No billing month.
   */
  async create(dto: CreateStudentPaymentDto): Promise<Payment> {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, branchId: true },
    });
    if (!student)
      throw new NotFoundException(`Student ${dto.studentId} not found`);

    // The student's single active membership resolves the group (may be none).
    const membership = await this.prisma.groupStudent.findFirst({
      where: { studentId: dto.studentId, leftAt: null },
      select: { groupId: true },
    });

    return this.prisma.payment.create({
      data: {
        studentId: student.id,
        groupId: membership?.groupId ?? null,
        branchId: student.branchId,
        amount: new Prisma.Decimal(dto.amount),
        method: dto.method,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        billingMonthStart: null,
        billingMonthEnd: null,
      },
      include: PAYMENT_INCLUDE,
    });
  }

  /** Paginated history, ordered by paidAt desc, with student/group/branch. */
  async findAll(
    query: QueryStudentPaymentDto,
  ): Promise<PaginatedResult<Payment>> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: { paidAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  private buildWhere(query: QueryStudentPaymentDto): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.method) where.method = query.method;

    if (query.search) {
      where.student = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.from || query.to) {
      where.paidAt = {};
      if (query.from) where.paidAt.gte = new Date(query.from);
      if (query.to) where.paidAt.lte = new Date(query.to);
    }

    return where;
  }
}
