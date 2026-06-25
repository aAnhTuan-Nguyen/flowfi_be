import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/request-with-user.interface';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtUser, @Query() query: ReportQueryDto) {
    return this.reportsService.summary(user.id, query);
  }

  @Get('categories')
  categories(@CurrentUser() user: JwtUser, @Query() query: ReportQueryDto) {
    return this.reportsService.categories(user.id, query);
  }

  @Get('cashflow')
  cashflow(@CurrentUser() user: JwtUser, @Query() query: ReportQueryDto) {
    return this.reportsService.cashflow(user.id, query);
  }
}
