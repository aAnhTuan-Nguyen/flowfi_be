import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from '../budgets/entities/budget.entity';
import { Goal } from '../goals/entities/goal.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { Wallet } from '../wallets/entities/wallet.entity';
import { SyncConflict } from './entities/sync-conflict.entity';
import { SyncQueue } from './entities/sync-queue.entity';
import { UserDevice } from './entities/user-device.entity';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    TransactionsModule,
    TypeOrmModule.forFeature([
      UserDevice,
      SyncQueue,
      SyncConflict,
      Wallet,
      Tag,
      Transaction,
      Budget,
      Goal,
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
