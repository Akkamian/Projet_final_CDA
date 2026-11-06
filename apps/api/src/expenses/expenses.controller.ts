import { Body, Controller, Delete, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator.js';
import { parseId } from '../common/parse-id.js';
import type { ExpenseDetail } from '../watches/watch-detail.js';
import { ExpenseDto, UpdateExpenseDto } from './dto/expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@Controller('projects/:projectId/expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  add(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: ExpenseDto): Promise<ExpenseDetail> {
    return this.expenses.add(user.id, parseId(projectId), dto);
  }

  @Patch(':expenseId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseDetail> {
    return this.expenses.update(user.id, parseId(projectId), parseId(expenseId), dto);
  }

  @Delete(':expenseId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('expenseId') expenseId: string): Promise<void> {
    return this.expenses.remove(user.id, parseId(projectId), parseId(expenseId));
  }
}
