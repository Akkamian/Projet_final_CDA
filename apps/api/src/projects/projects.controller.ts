import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/current-user.decorator.js';
import { parseId } from '../common/parse-id.js';
import type { ProjectDetail } from '../watches/watch-detail.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { ProjectsService } from './projects.service.js';

@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post('watches/:watchId/projects')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('watchId') watchId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectDetail> {
    return this.projects.create(user.id, parseId(watchId), dto);
  }

  @Post('projects/:projectId/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ): Promise<ProjectDetail> {
    return this.projects.complete(user.id, parseId(projectId));
  }

  @Delete('projects/:projectId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ): Promise<void> {
    return this.projects.remove(user.id, parseId(projectId));
  }

  @Post('projects/:projectId/reopen')
  @HttpCode(200)
  reopen(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ): Promise<ProjectDetail> {
    return this.projects.reopen(user.id, parseId(projectId));
  }
}
