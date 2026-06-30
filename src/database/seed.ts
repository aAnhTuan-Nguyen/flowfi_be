import 'reflect-metadata';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { EntityManager, In } from 'typeorm';
import dataSource from './data-source';
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  buildSeedData,
} from './seed-data';
import { AiProcessingRequest } from '../ai-processing/entities/ai-processing-request.entity';
import { AiProcessingResult } from '../ai-processing/entities/ai-processing-result.entity';
import { Budget } from '../budgets/entities/budget.entity';
import { Goal } from '../goals/entities/goal.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';

interface SeedCounts {
  wallets: number;
  tags: number;
  transactions: number;
  budgets: number;
  goals: number;
  notifications: number;
  aiRequests: number;
  aiResults: number;
}

async function seed() {
  await dataSource.initialize();

  try {
    const counts = await dataSource.transaction(async (manager) => {
      await resetDemoUser(manager);
      return createDemoUserData(manager);
    });

    printSummary(counts);
  } finally {
    await dataSource.destroy();
  }
}

async function resetDemoUser(manager: EntityManager) {
  const existingUser = await manager.findOne(User, {
    where: { email: DEMO_USER_EMAIL },
    withDeleted: true,
  });

  if (!existingUser) return;

  const oldAiRequests = await manager.find(AiProcessingRequest, {
    where: { userId: existingUser.id },
    withDeleted: true,
  });
  const oldAiRequestIds = oldAiRequests.map((request) => request.id);

  if (oldAiRequestIds.length > 0) {
    await manager.delete(AiProcessingResult, {
      requestId: In(oldAiRequestIds),
    });
    await manager.delete(AiProcessingRequest, { id: In(oldAiRequestIds) });
  }

  await manager.delete(User, { id: existingUser.id });
}

async function createDemoUserData(manager: EntityManager): Promise<SeedCounts> {
  const seedData = buildSeedData();
  const user = await manager.save(
    manager.create(User, {
      email: seedData.user.email,
      passwordHash: await bcrypt.hash(DEMO_USER_PASSWORD, 12),
      fullName: seedData.user.fullName,
      avatarUrl: seedData.user.avatarUrl,
      dateOfBirth: seedData.user.dateOfBirth,
      currencyCode: seedData.user.currencyCode,
      monthlyBudgetLimit: seedData.user.monthlyBudgetLimit,
      authProvider: seedData.user.authProvider,
    }),
  );

  const savedWallets = await manager.save(
    seedData.wallets.map((wallet) =>
      manager.create(Wallet, {
        userId: user.id,
        name: wallet.name,
        walletType: wallet.walletType,
        balance: '0.00',
        isDefault: wallet.isDefault,
        clientId: `seed-wallet-${wallet.key}`,
      }),
    ),
  );
  const walletsByKey = new Map(
    seedData.wallets.map((wallet, index) => [wallet.key, savedWallets[index]]),
  );

  const savedTags = await manager.save(
    seedData.tags.map((tag) =>
      manager.create(Tag, {
        userId: user.id,
        name: tag.name,
        type: tag.type,
        isDefault: tag.isDefault,
        clientId: `seed-tag-${tag.key}`,
      }),
    ),
  );
  const tagsByKey = new Map(
    seedData.tags.map((tag, index) => [tag.key, savedTags[index]]),
  );

  await manager.save(
    seedData.transactions.map((transaction) =>
      manager.create(Transaction, {
        walletId: mustGet(walletsByKey, transaction.walletKey, 'wallet').id,
        tagId: mustGet(tagsByKey, transaction.tagKey, 'tag').id,
        title: transaction.title,
        description: transaction.description,
        amount: transaction.amount,
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
        inputMethod: transaction.inputMethod,
        status: transaction.status,
        merchantName: transaction.merchantName,
        clientId: transaction.clientId,
      }),
    ),
  );

  await updateWalletBalances(manager, seedData.transactions, walletsByKey);

  await manager.save(
    seedData.budgets.map((budget) =>
      manager.create(Budget, {
        userId: user.id,
        tagId: budget.tagKey
          ? mustGet(tagsByKey, budget.tagKey, 'tag').id
          : null,
        budgetAmount: budget.budgetAmount,
        month: budget.month,
        year: budget.year,
        warningThresholdPercent: budget.warningThresholdPercent,
        clientId: `seed-budget-${budget.year}-${budget.month}-${budget.tagKey ?? 'all'}`,
      }),
    ),
  );

  await manager.save(
    seedData.goals.map((goal) =>
      manager.create(Goal, {
        userId: user.id,
        walletId: goal.walletKey
          ? mustGet(walletsByKey, goal.walletKey, 'wallet').id
          : null,
        name: goal.name,
        description: goal.description,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        status: goal.status,
        clientId: `seed-goal-${slug(goal.name)}`,
      }),
    ),
  );

  await manager.save(
    seedData.notifications.map((notification) =>
      manager.create(Notification, {
        userId: user.id,
        title: notification.title,
        content: notification.content,
        notificationType: notification.notificationType,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      }),
    ),
  );

  const savedAiRequests = await manager.save(
    seedData.aiRequests.map((request) =>
      manager.create(AiProcessingRequest, {
        userId: user.id,
        inputType: request.inputType,
        requestType: request.requestType,
        inputUrl: request.inputUrl,
        status: request.status,
        errorMessage: request.errorMessage,
        metadata: request.metadata,
        createdAt: request.createdAt,
      }),
    ),
  );
  const aiRequestsByKey = new Map(
    seedData.aiRequests.map((request, index) => [
      request.key,
      savedAiRequests[index],
    ]),
  );

  await manager.save(
    seedData.aiResults.map((result) =>
      manager.create(AiProcessingResult, {
        requestId: mustGet(aiRequestsByKey, result.requestKey, 'AI request').id,
        amount: result.amount,
        transactionType: result.transactionType,
        tag: result.tag,
        transactionDate: result.transactionDate,
        confidence: result.confidence,
        rawResponse: result.rawResponse,
        parsedData: result.parsedData,
      }),
    ),
  );

  return {
    wallets: seedData.wallets.length,
    tags: seedData.tags.length,
    transactions: seedData.transactions.length,
    budgets: seedData.budgets.length,
    goals: seedData.goals.length,
    notifications: seedData.notifications.length,
    aiRequests: seedData.aiRequests.length,
    aiResults: seedData.aiResults.length,
  };
}

async function updateWalletBalances(
  manager: EntityManager,
  transactions: Array<{
    walletKey: string;
    amount: string;
    transactionType: TransactionType;
    status: TransactionStatus;
  }>,
  walletsByKey: Map<string, Wallet>,
) {
  const balancesByWalletKey = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.status !== TransactionStatus.Confirmed) continue;

    const currentBalance = balancesByWalletKey.get(transaction.walletKey) ?? 0;
    const amount = toCents(transaction.amount);
    const effect =
      transaction.transactionType === TransactionType.Income ? amount : -amount;
    balancesByWalletKey.set(transaction.walletKey, currentBalance + effect);
  }

  for (const [walletKey, wallet] of walletsByKey) {
    wallet.balance = fromCents(balancesByWalletKey.get(walletKey) ?? 0);
  }

  await manager.save([...walletsByKey.values()]);
}

function toCents(amount: string): number {
  const [whole, fraction = ''] = amount.split('.');
  const cents = Number(`${whole}${fraction.padEnd(2, '0').slice(0, 2)}`);

  if (!Number.isFinite(cents)) {
    throw new Error(`Invalid money amount: ${amount}`);
  }

  return cents;
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');

  return `${sign}${whole}.${fraction}`;
}

function mustGet<K, V>(map: Map<K, V>, key: K, label: string): V {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label} for seed key: ${String(key)}`);
  }
  return value;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function printSummary(counts: SeedCounts) {
  console.log('FlowFi demo seed completed.');
  console.log(`Email: ${DEMO_USER_EMAIL}`);
  console.log(`Password: ${DEMO_USER_PASSWORD}`);
  console.table(counts);
}

seed().catch((error) => {
  console.error('FlowFi demo seed failed.');
  console.error(error);
  process.exitCode = 1;
});
