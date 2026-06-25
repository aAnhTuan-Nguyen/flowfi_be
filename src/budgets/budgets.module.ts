import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { BudgetProgressService } from './budget-progress.service';
import { BudgetAlertLog } from './entities/budget-alert-log.entity';
import { Budget } from './entities/budget.entity';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Budget,
      Tag,
      Transaction,
      Notification,
      BudgetAlertLog,
    ]),
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetProgressService],
  exports: [BudgetProgressService],
})
export class BudgetsModule {}
