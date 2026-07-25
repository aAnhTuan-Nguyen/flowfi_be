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
import type { JwtUser } from '../common/interfaces/request-with-user.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionSummaryQueryDto } from './dto/transaction-summary-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll(user.id, query);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtUser,
    @Query() query: TransactionSummaryQueryDto,
  ) {
    return this.transactionsService.getSummary(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.transactionsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Post(':id/confirm')
  confirmWithPost(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.transactionsService.confirm(user.id, id);
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.transactionsService.confirm(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.transactionsService.remove(user.id, id);
  }
}
