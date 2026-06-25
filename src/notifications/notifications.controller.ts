import { Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { JwtUser } from '../common/interfaces/request-with-user.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.notificationsService.findAll(user.id, query);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: JwtUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.notificationsService.remove(user.id, id);
  }
}
