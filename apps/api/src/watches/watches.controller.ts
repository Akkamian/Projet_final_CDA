import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator.js';
import { CreateWatchDto } from './dto/create-watch.dto.js';
import type { WatchDetail } from './watch-detail.js';
import { WatchesService } from './watches.service.js';

@Controller('watches')
export class WatchesController {
  constructor(private readonly watches: WatchesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWatchDto): Promise<WatchDetail> {
    return this.watches.create(user.id, dto);
  }
}
