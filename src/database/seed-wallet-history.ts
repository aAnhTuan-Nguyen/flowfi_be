import 'reflect-metadata';
import 'dotenv/config';
import { EntityManager, Like } from 'typeorm';
import dataSource from './data-source';
import {
  buildSampleMonthPlan,
  centsToDecimal,
  decimalToCents,
} from './sample-wallet-history';
import { Budget } from '../budgets/entities/budget.entity';
import { SyncStatus } from '../sync/sync.enums';
import { Tag } from '../tags/entities/tag.entity';
import { TagType } from '../tags/tag.enums';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  TransactionInputMethod,
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
import { Wallet } from '../wallets/entities/wallet.entity';

const DEFAULT_WALLET_ID = '75fdcb23-61a7-4358-b419-349c773ad1df';
const SAMPLE_PREFIX = 'sample-wallet-history';
const SAMPLE_TAG_CLIENT_ID = `${SAMPLE_PREFIX}-tag`;
const YEAR = 2026;

interface MonthSeed {
  month: number;
  ratioNumerator: bigint;
  ratioDenominator: bigint;
  label: string;
  transactionTitles: string[];
}

const MONTHS: MonthSeed[] = [
  {
    month: 4,
    ratioNumerator: 168n,
    ratioDenominator: 100n,
    label: 'Vượt chi 68%',
    transactionTitles: [
      'Tiền thuê nhà tháng 4',
      'Mua sắm tháng 4',
      'Ăn uống tháng 4',
      'Hóa đơn tháng 4',
    ],
  },
  {
    month: 5,
    ratioNumerator: 80n,
    ratioDenominator: 100n,
    label: 'Tiết kiệm 20%',
    transactionTitles: [
      'Tiền thuê nhà tháng 5',
      'Mua sắm tháng 5',
      'Ăn uống tháng 5',
      'Hóa đơn tháng 5',
    ],
  },
];

async function seedWalletHistory() {
  const walletId =
    process.argv.slice(2).find((argument) => argument !== '--') ??
    DEFAULT_WALLET_ID;
  await dataSource.initialize();

  try {
    const results = await dataSource.transaction((manager) =>
      createSampleHistory(manager, walletId),
    );
    console.log(`Sample history completed for wallet ${walletId}.`);
    console.table(results);
  } finally {
    await dataSource.destroy();
  }
}

async function createSampleHistory(manager: EntityManager, walletId: string) {
  const walletRepository = manager.getRepository(Wallet);
  const wallet = await walletRepository.findOne({
    where: { id: walletId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!wallet) {
    throw new Error(
      `Wallet ${walletId} was not found in the configured database.`,
    );
  }

  const tag = await ensureSampleTag(manager, wallet.userId);
  const summaries: Array<Record<string, string | number>> = [];
  let balanceDeltaCents = 0n;

  for (const monthSeed of MONTHS) {
    const transactionPrefix = `${SAMPLE_PREFIX}-${YEAR}-${monthSeed.month}-tx-`;
    const budgetClientId = `${SAMPLE_PREFIX}-${YEAR}-${monthSeed.month}-budget`;

    const [expenseRow] = (await manager.query(
      `
        SELECT COALESCE(SUM(t.amount), 0)::text AS total
        FROM transactions t
        INNER JOIN wallets w ON w.id = t.wallet_id
        WHERE w.user_id = $1
          AND w.deleted_at IS NULL
          AND t.deleted_at IS NULL
          AND t.transaction_type = $2
          AND t.status = $3
          AND t.transaction_date >= $4
          AND t.transaction_date < $5
          AND (t.client_id IS NULL OR t.client_id NOT LIKE $6)
      `,
      [
        wallet.userId,
        TransactionType.Expense,
        TransactionStatus.Confirmed,
        monthStart(YEAR, monthSeed.month),
        monthStart(YEAR, monthSeed.month + 1),
        `${transactionPrefix}%`,
      ],
    )) as Array<{ total: string }>;

    const [budgetRow] = (await manager.query(
      `
        SELECT COALESCE(SUM(b.budget_amount), 0)::text AS total
        FROM budgets b
        WHERE b.user_id = $1
          AND b.deleted_at IS NULL
          AND b.year = $2
          AND b.month = $3
          AND (b.client_id IS NULL OR b.client_id <> $4)
      `,
      [wallet.userId, YEAR, monthSeed.month, budgetClientId],
    )) as Array<{ total: string }>;

    const plan = buildSampleMonthPlan(
      decimalToCents(expenseRow.total),
      decimalToCents(budgetRow.total),
      monthSeed.ratioNumerator,
      monthSeed.ratioDenominator,
    );

    await upsertSampleBudget(
      manager,
      wallet.userId,
      tag.id,
      monthSeed.month,
      budgetClientId,
      centsToDecimal(plan.sampleBudgetCents),
    );

    const oldSampleExpenseCents = await replaceSampleTransactions(
      manager,
      wallet.id,
      tag.id,
      monthSeed,
      transactionPrefix,
      plan.sampleExpenseCents,
    );
    balanceDeltaCents += oldSampleExpenseCents - plan.sampleExpenseCents;

    summaries.push({
      month: monthSeed.month,
      result: monthSeed.label,
      budget: centsToDecimal(plan.finalBudgetCents),
      expense: centsToDecimal(plan.finalExpenseCents),
      sampleTransactions: monthSeed.transactionTitles.length,
    });
  }

  wallet.balance = centsToDecimal(
    decimalToCents(wallet.balance) + balanceDeltaCents,
  );
  wallet.version += 1;
  wallet.syncStatus = SyncStatus.Synced;
  wallet.lastSyncedAt = new Date();
  await walletRepository.save(wallet);

  return summaries;
}

async function ensureSampleTag(
  manager: EntityManager,
  userId: string,
): Promise<Tag> {
  const repository = manager.getRepository(Tag);
  const existing = await repository.findOne({
    where: { userId, clientId: SAMPLE_TAG_CLIENT_ID },
    withDeleted: true,
  });
  const tag =
    existing ??
    repository.create({
      userId,
      clientId: SAMPLE_TAG_CLIENT_ID,
      name: 'Chi tiêu mẫu',
      type: TagType.Expense,
      isDefault: false,
    });
  Object.assign(tag, {
    deletedAt: null,
    name: 'Chi tiêu mẫu',
    type: TagType.Expense,
    syncStatus: SyncStatus.Synced,
    lastSyncedAt: new Date(),
  });
  return repository.save(tag);
}

async function upsertSampleBudget(
  manager: EntityManager,
  userId: string,
  tagId: string,
  month: number,
  clientId: string,
  amount: string,
) {
  const repository = manager.getRepository(Budget);
  const matches = await repository.find({
    where: { userId, clientId },
    withDeleted: true,
    order: { createdAt: 'ASC' },
  });
  const budget =
    matches.shift() ??
    repository.create({
      userId,
      tagId,
      month,
      year: YEAR,
      clientId,
      warningThresholdPercent: 80,
    });
  if (matches.length > 0) {
    await repository.softRemove(matches);
  }
  Object.assign(budget, {
    deletedAt: null,
    tagId,
    budgetAmount: amount,
    month,
    year: YEAR,
    warningThresholdPercent: 80,
    syncStatus: SyncStatus.Synced,
    lastSyncedAt: new Date(),
  });
  await repository.save(budget);
}

async function replaceSampleTransactions(
  manager: EntityManager,
  walletId: string,
  tagId: string,
  monthSeed: MonthSeed,
  clientIdPrefix: string,
  totalExpenseCents: bigint,
): Promise<bigint> {
  const repository = manager.getRepository(Transaction);
  const existing = await repository.find({
    where: { walletId, clientId: Like(`${clientIdPrefix}%`) },
    withDeleted: true,
  });
  const oldActiveExpenseCents = existing
    .filter(
      (item) =>
        item.deletedAt === null &&
        item.status === TransactionStatus.Confirmed &&
        item.transactionType === TransactionType.Expense,
    )
    .reduce((sum, item) => sum + decimalToCents(item.amount), 0n);

  const amounts = splitAmount(totalExpenseCents, 4);
  const byClientId = new Map(existing.map((item) => [item.clientId, item]));
  const savedIds = new Set<string>();

  for (let index = 0; index < monthSeed.transactionTitles.length; index += 1) {
    const clientId = `${clientIdPrefix}${index + 1}`;
    const transaction =
      byClientId.get(clientId) ??
      repository.create({
        walletId,
        tagId,
        clientId,
      });
    Object.assign(transaction, {
      deletedAt: null,
      tagId,
      title: monthSeed.transactionTitles[index],
      description: `Dữ liệu mẫu: ${monthSeed.label}`,
      amount: centsToDecimal(amounts[index]),
      transactionType: TransactionType.Expense,
      transactionDate: new Date(
        Date.UTC(YEAR, monthSeed.month - 1, 5 + index * 6, 8),
      ),
      inputMethod: TransactionInputMethod.Manual,
      status: TransactionStatus.Confirmed,
      merchantName: 'FlowFi Sample',
      syncStatus: SyncStatus.Synced,
      lastSyncedAt: new Date(),
    });
    const saved = await repository.save(transaction);
    savedIds.add(saved.id);
  }

  const obsolete = existing.filter((item) => !savedIds.has(item.id));
  if (obsolete.length > 0) {
    await repository.softRemove(obsolete);
  }

  return oldActiveExpenseCents;
}

function splitAmount(total: bigint, parts: number): bigint[] {
  const count = BigInt(parts);
  const base = total / count;
  const remainder = total % count;
  return Array.from({ length: parts }, (_, index) =>
    BigInt(index) < remainder ? base + 1n : base,
  );
}

function monthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

seedWalletHistory().catch((error: unknown) => {
  console.error('Wallet sample history failed.');
  console.error(
    error instanceof Error
      ? error.message || error.name || 'Unknown database error'
      : error,
  );
  process.exitCode = 1;
});
