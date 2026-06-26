import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { User } from '../users/entities/user.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { BudgetAlertLog } from '../budgets/entities/budget-alert-log.entity';
import { Budget } from '../budgets/entities/budget.entity';
import { Goal } from '../goals/entities/goal.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { UserDevice } from '../sync/entities/user-device.entity';
import { SyncQueue } from '../sync/entities/sync-queue.entity';
import { SyncConflict } from '../sync/entities/sync-conflict.entity';
import { AiProcessingRequest } from '../ai-processing/entities/ai-processing-request.entity';
import { AiProcessingResult } from '../ai-processing/entities/ai-processing-result.entity';
import { InitialFlowFiMvp1780000000000 } from './migrations/1780000000000-InitialFlowFiMvp';
import { AuthBudgetAlerts1780000001000 } from './migrations/1780000001000-AuthBudgetAlerts';
import { AddAiProcessing1780000002000 } from './migrations/1780000002000-AddAiProcessing';

const env = validateEnv(process.env);

export default new DataSource({
  type: 'postgres',
  url: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: env.typeormLogging,
  entities: [
    User,
    PasswordResetToken,
    RefreshToken,
    Wallet,
    Tag,
    Transaction,
    BudgetAlertLog,
    Budget,
    Goal,
    Notification,
    UserDevice,
    SyncQueue,
    SyncConflict,
    AiProcessingRequest,
    AiProcessingResult,
  ],
  migrations: [
    InitialFlowFiMvp1780000000000,
    AuthBudgetAlerts1780000001000,
    AddAiProcessing1780000002000,
  ],
});
