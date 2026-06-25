import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from '../tags/entities/tag.entity';
import { Budget } from './entities/budget.entity';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Tag])],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}
