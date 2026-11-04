import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { DASHBOARD_STATUSES, type DashboardStatus } from './status.js';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator.js';
import { CreateWatchDto } from './dto/create-watch.dto.js';
import type { WatchDetail } from './watch-detail.js';
import { WatchesService, type WatchList } from './watches.service.js';

@Controller('watches')
export class WatchesController {
  constructor(private readonly watches: WatchesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWatchDto): Promise<WatchDetail> {
    return this.watches.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: unknown): Promise<WatchList> {
    // Validation manuelle (comme le ruling de la tâche 6) : le ValidationPipe ignore les paramètres typés `unknown`.
    if (status !== undefined && !DASHBOARD_STATUSES.includes(status as DashboardStatus)) {
      throw apiError(400, 'INVALID_STATUS', `Statut inconnu : attendu ${DASHBOARD_STATUSES.join(', ')}`);
    }
    return this.watches.list(user.id, status as DashboardStatus | undefined);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<WatchDetail> {
    // Un identifiant qui n'est pas un entier positif ne peut désigner aucune montre : 404, pas 400 (RG-SEC-04).
    if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) throw new NotFoundException();
    return this.watches.findOne(user.id, Number(id));
  }
}
