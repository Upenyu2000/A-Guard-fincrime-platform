import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma, RiskLevel } from "@prisma/client";
import { AuditLogService } from "../audit-log-service/audit-log-service.service";
import { PrismaService } from "../database/prisma.service";
import { AuthenticatedPrincipal } from "../security/auth.types";
import { CreateLiveCaseDto } from "./live.dto";

@Injectable()
export class LiveCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(principal: AuthenticatedPrincipal, dto: CreateLiveCaseDto) {
    await this.prisma.ensureConnected();
    return this.prisma.$transaction(async (tx) => {
      if (dto.transactionIds?.length) {
        const count = await tx.transactionMonitor.count({
          where: { tenantId: principal.tenantId, id: { in: dto.transactionIds } },
        });
        if (count !== dto.transactionIds.length) {
          throw new ForbiddenException("One or more transactions do not belong to this tenant.");
        }
      }

      const created = await tx.case.create({
        data: {
          tenantId: principal.tenantId,
          alertId: dto.alertId,
          title: dto.title,
          assigneeSubject: dto.assigneeSubject,
          priority: RiskLevel[dto.priority],
          lossExposure: new Prisma.Decimal(dto.lossExposure),
          recoveryPotential: new Prisma.Decimal(dto.recoveryPotential),
        },
      });

      if (dto.transactionIds?.length) {
        await tx.caseTransaction.createMany({
          data: dto.transactionIds.map((transactionId) => ({
            caseId: created.id,
            transactionId,
            linkReason: "case_creation",
          })),
        });
      }

      await this.audit.append(
        {
          tenantId: principal.tenantId,
          actor: principal.subject,
          role: principal.roles[0] ?? "unknown",
          action: "case.created",
          target: created.id,
          metadata: {
            priority: created.priority,
            transactionCount: dto.transactionIds?.length ?? 0,
          },
        },
        tx,
      );

      return {
        ...created,
        lossExposure: created.lossExposure.toString(),
        recoveryPotential: created.recoveryPotential.toString(),
      };
    });
  }

  async list(tenantId: string, limit: number, cursor?: string) {
    await this.prisma.ensureConnected();
    const rows = await this.prisma.case.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { transactions: true, evidenceCaptures: true } },
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((item) => ({
        ...item,
        lossExposure: item.lossExposure.toString(),
        recoveryPotential: item.recoveryPotential.toString(),
      })),
      nextCursor: hasMore ? items.at(-1)?.id : undefined,
    };
  }
}
