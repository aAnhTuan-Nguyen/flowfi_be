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
import { BudgetProgressService } from './budget-progress.service';
import { BudgetsService } from './budgets.service';
import { BudgetProgressQueryDto } from './dto/budget-progress-query.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly budgetProgressService: BudgetProgressService,
  ) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.budgetsService.findAll(user.id, query);
  }

  @Get('progress')
  progress(
    @CurrentUser() user: JwtUser,
    @Query() query: BudgetProgressQueryDto,
  ) {
    return this.budgetProgressService.getAllProgress(
      user.id,
      query.month,
      query.year,
    );
  }

  @Get(':id/progress')
  oneProgress(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.budgetProgressService.getOneProgress(user.id, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.budgetsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.budgetsService.remove(user.id, id);
  }
}
