import { Body, Controller, Delete, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator.js';
import { parseId } from '../common/parse-id.js';
import type { StepDetail } from '../watches/watch-detail.js';
import { CreateStepDto } from './dto/create-step.dto.js';
import { ReorderStepsDto } from './dto/reorder-steps.dto.js';
import { UpdateStepDto } from './dto/update-step.dto.js';
import { StepsService } from './steps.service.js';

@Controller('projects/:projectId/steps')
export class StepsController {
  constructor(private readonly steps: StepsService) {}

  @Post()
  add(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateStepDto): Promise<StepDetail> {
    return this.steps.add(user.id, parseId(projectId), dto.label);
  }

  // Déclarée avant `:stepId` pour que « order » ne soit jamais lu comme un identifiant.
  @Put('order')
  reorder(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: ReorderStepsDto): Promise<StepDetail[]> {
    return this.steps.reorder(user.id, parseId(projectId), dto.stepIds);
  }

  @Patch(':stepId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
  ): Promise<StepDetail> {
    return this.steps.update(user.id, parseId(projectId), parseId(stepId), dto);
  }

  @Delete(':stepId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('stepId') stepId: string): Promise<void> {
    return this.steps.remove(user.id, parseId(projectId), parseId(stepId));
  }
}
