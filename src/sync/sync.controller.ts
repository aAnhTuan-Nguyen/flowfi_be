import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/request-with-user.interface';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { SyncPullQueryDto } from './dto/sync-pull-query.dto';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('devices')
  registerDevice(@CurrentUser() user: JwtUser, @Body() dto: RegisterDeviceDto) {
    return this.syncService.registerDevice(user.id, dto);
  }

  @Get('pull')
  pull(@CurrentUser() user: JwtUser, @Query() query: SyncPullQueryDto) {
    return this.syncService.pull(user.id, query);
  }

  @Post('push')
  push(@CurrentUser() user: JwtUser, @Body() dto: SyncPushDto) {
    return this.syncService.push(user.id, dto);
  }

  @Get('conflicts')
  conflicts(@CurrentUser() user: JwtUser) {
    return this.syncService.conflicts(user.id);
  }

  @Post('conflicts/:id/resolve')
  resolveConflict(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.syncService.resolveConflict(user.id, id, dto);
  }
}
