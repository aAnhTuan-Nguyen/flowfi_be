import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Budget } from '../budgets/entities/budget.entity';
import { Goal } from '../goals/entities/goal.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { UserDevice } from '../sync/entities/user-device.entity';
import { SyncQueue } from '../sync/entities/sync-queue.entity';
import { SyncConflict } from '../sync/entities/sync-conflict.entity';
import { InitialFlowFiMvp1780000000000 } from './migrations/1780000000000-InitialFlowFiMvp';

const env = validateEnv(process.env);

export default new DataSource({
  type: 'postgres',
  url: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: env.typeormLogging,
  entities: [
    User,
    RefreshToken,
    Wallet,
    Tag,
    Transaction,
    Budget,
    Goal,
    Notification,
    UserDevice,
    SyncQueue,
    SyncConflict,
  ],
  migrations: [InitialFlowFiMvp1780000000000],
});
