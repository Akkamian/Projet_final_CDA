import { Injectable } from '@nestjs/common';
import { OwnershipService } from '../common/ownership.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toExpenseDetail, type ExpenseDetail } from '../watches/watch-detail.js';
import type { ExpenseDto, UpdateExpenseDto } from './dto/expense.dto.js';

/** La marge n'est jamais stockée : elle se recalcule à la lecture de la montre (RG-FIN-06), il n'y a rien à mettre à jour ici. */
@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async add(userId: number, projectId: number, dto: ExpenseDto): Promise<ExpenseDetail> {
    await this.ownership.findOwnedProject(userId, projectId);
    const row = await this.prisma.expenses.create({
      data: { project_id: projectId, label: dto.label, amount: dto.amount, expense_date: new Date(dto.expenseDate) },
    });
    return toExpenseDetail(row);
  }

  async update(userId: number, projectId: number, expenseId: number, dto: UpdateExpenseDto): Promise<ExpenseDetail> {
    await this.ownership.findOwnedExpense(userId, projectId, expenseId);
    const data: Prisma.expensesUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.expenseDate !== undefined) data.expense_date = new Date(dto.expenseDate);
    return toExpenseDetail(await this.prisma.expenses.update({ where: { id: expenseId }, data }));
  }

  async remove(userId: number, projectId: number, expenseId: number): Promise<void> {
    await this.ownership.findOwnedExpense(userId, projectId, expenseId);
    await this.prisma.expenses.deleteMany({ where: { id: expenseId, project_id: projectId } });
  }
}
