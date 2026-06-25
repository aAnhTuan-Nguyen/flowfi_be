import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { JwtUser } from '../common/interfaces/request-with-user.interface';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateWalletDto) {
    return this.walletsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.walletsService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.walletsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto,
  ) {
    return this.walletsService.update(user.id, id, dto);
  }

  @Post(':id/default')
  setDefault(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.walletsService.setDefault(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.walletsService.remove(user.id, id);
  }
}
