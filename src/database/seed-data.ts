import {
  AiInputType,
  AiRequestStatus,
  AiRequestType,
  AiTag,
  AiTransactionType,
} from '../ai-processing/ai-processing.enums';
import { GoalStatus } from '../goals/goal.enums';
import { NotificationType } from '../notifications/notification.enums';
import { TagType } from '../tags/tag.enums';
import {
  TransactionInputMethod,
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
import { WalletType } from '../wallets/wallet.enums';
import { AuthProvider } from '../users/user.enums';

export const DEMO_USER_EMAIL = 'demo@flowfi.test';
export const DEMO_USER_PASSWORD = 'Test@123456';

export type SeedBudgetStatus = 'Safe' | 'Warning' | 'Exceeded';

export interface SeedUser {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  dateOfBirth: string;
  currencyCode: string;
  monthlyBudgetLimit: string;
  authProvider: AuthProvider;
}

export interface SeedWallet {
  key: string;
  name: string;
  walletType: WalletType;
  isDefault: boolean;
}

export interface SeedTag {
  key: string;
  name: string;
  type: TagType;
  isDefault: boolean;
}

export interface SeedTransaction {
  walletKey: string;
  tagKey: string;
  title: string;
  description: string | null;
  amount: string;
  transactionType: TransactionType;
  transactionDate: Date;
  inputMethod: TransactionInputMethod;
  status: TransactionStatus;
  merchantName: string | null;
  clientId: string;
}

export interface SeedBudget {
  tagKey: string | null;
  budgetAmount: string;
  month: number;
  year: number;
  warningThresholdPercent: number;
  expectedStatus: SeedBudgetStatus;
}

export interface SeedGoal {
  walletKey: string | null;
  name: string;
  description: string | null;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  status: GoalStatus;
}

export interface SeedNotification {
  title: string;
  content: string | null;
  notificationType: NotificationType;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

export interface SeedAiRequest {
  key: string;
  inputType: AiInputType;
  requestType: AiRequestType;
  inputUrl: string | null;
  status: AiRequestStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SeedAiResult {
  requestKey: string;
  amount: string | null;
  transactionType: AiTransactionType | null;
  tag: AiTag | null;
  transactionDate: Date | null;
  confidence: string | null;
  rawResponse: string | null;
  parsedData: Record<string, unknown> | null;
}

export interface DemoSeedData {
  user: SeedUser;
  wallets: SeedWallet[];
  tags: SeedTag[];
  transactions: SeedTransaction[];
  budgets: SeedBudget[];
  goals: SeedGoal[];
  notifications: SeedNotification[];
  aiRequests: SeedAiRequest[];
  aiResults: SeedAiResult[];
}

type SeedTransactionInput = Pick<
  SeedTransaction,
  'walletKey' | 'tagKey' | 'title' | 'amount' | 'transactionType'
> &
  Partial<
    Pick<
      SeedTransaction,
      'description' | 'inputMethod' | 'status' | 'merchantName'
    >
  >;

export function buildSeedData(referenceDate = new Date()): DemoSeedData {
  const current = monthInfo(referenceDate, 0);
  const previous = monthInfo(referenceDate, -1);

  return {
    user: {
      email: DEMO_USER_EMAIL,
      fullName: 'FlowFi Demo User',
      avatarUrl: null,
      dateOfBirth: '1996-08-18',
      currencyCode: 'VND',
      monthlyBudgetLimit: '12000000.00',
      authProvider: AuthProvider.Local,
    },
    wallets: wallets(),
    tags: tags(),
    transactions: transactions(referenceDate),
    budgets: [
      {
        tagKey: null,
        budgetAmount: '12000000.00',
        month: current.month,
        year: current.year,
        warningThresholdPercent: 80,
        expectedStatus: 'Exceeded',
      },
      {
        tagKey: 'food',
        budgetAmount: '1200000.00',
        month: current.month,
        year: current.year,
        warningThresholdPercent: 80,
        expectedStatus: 'Safe',
      },
      {
        tagKey: 'groceries',
        budgetAmount: '2000000.00',
        month: current.month,
        year: current.year,
        warningThresholdPercent: 80,
        expectedStatus: 'Exceeded',
      },
      {
        tagKey: 'bills',
        budgetAmount: '1300000.00',
        month: current.month,
        year: current.year,
        warningThresholdPercent: 80,
        expectedStatus: 'Warning',
      },
      {
        tagKey: 'transport',
        budgetAmount: '800000.00',
        month: current.month,
        year: current.year,
        warningThresholdPercent: 80,
        expectedStatus: 'Safe',
      },
      {
        tagKey: null,
        budgetAmount: '11500000.00',
        month: previous.month,
        year: previous.year,
        warningThresholdPercent: 80,
        expectedStatus: 'Exceeded',
      },
      {
        tagKey: 'shopping',
        budgetAmount: '1800000.00',
        month: previous.month,
        year: previous.year,
        warningThresholdPercent: 75,
        expectedStatus: 'Safe',
      },
      {
        tagKey: 'entertainment',
        budgetAmount: '900000.00',
        month: previous.month,
        year: previous.year,
        warningThresholdPercent: 80,
        expectedStatus: 'Warning',
      },
    ],
    goals: goals(referenceDate),
    notifications: notifications(referenceDate),
    aiRequests: aiRequests(referenceDate),
    aiResults: aiResults(referenceDate),
  };
}

function wallets(): SeedWallet[] {
  return [
    {
      key: 'checking',
      name: 'Main Bank Account',
      walletType: WalletType.Bank,
      isDefault: true,
    },
    {
      key: 'cash',
      name: 'Cash Wallet',
      walletType: WalletType.Cash,
      isDefault: false,
    },
    {
      key: 'momo',
      name: 'MoMo E-Wallet',
      walletType: WalletType.EWallet,
      isDefault: false,
    },
    {
      key: 'savings',
      name: 'Savings Vault',
      walletType: WalletType.Bank,
      isDefault: false,
    },
    {
      key: 'credit',
      name: 'Credit Card',
      walletType: WalletType.Bank,
      isDefault: false,
    },
  ];
}

function tags(): SeedTag[] {
  return [
    tag('salary', 'Salary', TagType.Income),
    tag('freelance', 'Freelance', TagType.Income),
    tag('bonus', 'Bonus', TagType.Income),
    tag('interest', 'Interest', TagType.Income),
    tag('refund', 'Refund', TagType.Income),
    tag('food', 'Food & Coffee', TagType.Expense),
    tag('groceries', 'Groceries', TagType.Expense),
    tag('transport', 'Transport', TagType.Expense),
    tag('bills', 'Bills', TagType.Expense),
    tag('rent', 'Rent', TagType.Expense),
    tag('shopping', 'Shopping', TagType.Expense),
    tag('health', 'Health', TagType.Expense),
    tag('education', 'Education', TagType.Expense),
    tag('entertainment', 'Entertainment', TagType.Expense),
    tag('travel', 'Travel', TagType.Expense),
  ];
}

function tag(key: string, name: string, type: TagType): SeedTag {
  return { key, name, type, isDefault: false };
}

function transactions(referenceDate: Date): SeedTransaction[] {
  const rows: SeedTransaction[] = [];

  rows.push(
    tx(referenceDate, 0, 1, {
      walletKey: 'checking',
      tagKey: 'salary',
      title: 'Monthly salary',
      amount: '28000000.00',
      transactionType: TransactionType.Income,
      merchantName: 'FlowFi Labs',
    }),
    tx(referenceDate, 0, 7, {
      walletKey: 'momo',
      tagKey: 'freelance',
      title: 'Landing page freelance project',
      amount: '4500000.00',
      transactionType: TransactionType.Income,
      merchantName: 'Studio Client',
    }),
    tx(referenceDate, 0, 15, {
      walletKey: 'checking',
      tagKey: 'refund',
      title: 'Returned order refund',
      amount: '250000.00',
      transactionType: TransactionType.Income,
      merchantName: 'Tiki',
    }),
    tx(referenceDate, 0, 20, {
      walletKey: 'savings',
      tagKey: 'interest',
      title: 'Savings interest',
      amount: '150000.00',
      transactionType: TransactionType.Income,
      merchantName: 'Bank',
    }),
    tx(referenceDate, 0, 2, {
      walletKey: 'checking',
      tagKey: 'rent',
      title: 'Apartment rent',
      amount: '6500000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Landlord',
    }),
    tx(referenceDate, 0, 3, {
      walletKey: 'cash',
      tagKey: 'groceries',
      title: 'Weekly groceries',
      amount: '750000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'WinMart',
    }),
    tx(referenceDate, 0, 10, {
      walletKey: 'momo',
      tagKey: 'groceries',
      title: 'Fresh food shopping',
      amount: '620000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Bach Hoa Xanh',
    }),
    tx(referenceDate, 0, 18, {
      walletKey: 'checking',
      tagKey: 'groceries',
      title: 'Monthly pantry stock',
      amount: '840000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Co.opmart',
    }),
    ...(
      [
        ['Morning pho', '120000.00', 4, 'Pho Thin'],
        ['Team coffee', '85000.00', 5, 'Highlands Coffee'],
        ['Dinner with friends', '180000.00', 8, 'Pizza 4P'],
        ['Lunch combo', '95000.00', 12, 'Com Tam Ba Ghien'],
        ['Milk tea', '145000.00', 17, 'Phuc Long'],
        ['Breakfast banh mi', '70000.00', 22, 'Banh Mi Huynh Hoa'],
        ['Weekend brunch', '220000.00', 26, 'The Coffee House'],
      ] satisfies Array<[string, string, number, string]>
    ).map(([title, amount, day, merchant]) =>
      tx(referenceDate, 0, Number(day), {
        walletKey: 'momo',
        tagKey: 'food',
        title,
        amount,
        transactionType: TransactionType.Expense,
        merchantName: merchant,
      }),
    ),
    ...(
      [
        ['Grab rides', '65000.00', 4, 'Grab'],
        ['Airport taxi', '120000.00', 11, 'Mai Linh'],
        ['Fuel refill', '250000.00', 16, 'Petrolimex'],
        ['Bus pass top-up', '80000.00', 24, 'Public Transit'],
      ] satisfies Array<[string, string, number, string]>
    ).map(([title, amount, day, merchant]) =>
      tx(referenceDate, 0, Number(day), {
        walletKey: 'cash',
        tagKey: 'transport',
        title,
        amount,
        transactionType: TransactionType.Expense,
        merchantName: merchant,
      }),
    ),
    tx(referenceDate, 0, 6, {
      walletKey: 'checking',
      tagKey: 'bills',
      title: 'Electricity bill',
      amount: '620000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'EVN',
    }),
    tx(referenceDate, 0, 9, {
      walletKey: 'checking',
      tagKey: 'bills',
      title: 'Home internet',
      amount: '250000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'FPT Telecom',
    }),
    tx(referenceDate, 0, 13, {
      walletKey: 'momo',
      tagKey: 'bills',
      title: 'Water bill',
      amount: '180000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Water Supplier',
    }),
    tx(referenceDate, 0, 21, {
      walletKey: 'momo',
      tagKey: 'bills',
      title: 'Phone plan',
      amount: '180000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Viettel',
    }),
    tx(referenceDate, 0, 14, {
      walletKey: 'credit',
      tagKey: 'shopping',
      title: 'Office chair',
      amount: '1250000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Shopee',
    }),
    tx(referenceDate, 0, 19, {
      walletKey: 'credit',
      tagKey: 'shopping',
      title: 'Clothes order',
      amount: '590000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Uniqlo',
    }),
    tx(referenceDate, 0, 25, {
      walletKey: 'momo',
      tagKey: 'shopping',
      title: 'Home supplies',
      amount: '350000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Daiso',
    }),
    tx(referenceDate, 0, 15, {
      walletKey: 'checking',
      tagKey: 'health',
      title: 'Clinic visit',
      amount: '430000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Family Clinic',
    }),
    tx(referenceDate, 0, 16, {
      walletKey: 'credit',
      tagKey: 'education',
      title: 'Online course',
      amount: '850000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Udemy',
    }),
    tx(referenceDate, 0, 18, {
      walletKey: 'cash',
      tagKey: 'entertainment',
      title: 'Movie night',
      amount: '360000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'CGV',
    }),
    tx(referenceDate, 0, 23, {
      walletKey: 'momo',
      tagKey: 'entertainment',
      title: 'Karaoke with team',
      amount: '420000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'King Karaoke',
    }),
    tx(referenceDate, 0, 27, {
      walletKey: 'checking',
      tagKey: 'travel',
      title: 'Da Nang weekend trip',
      amount: '1800000.00',
      transactionType: TransactionType.Expense,
      merchantName: 'Vietnam Airlines',
    }),
    tx(referenceDate, 0, 28, {
      walletKey: 'momo',
      tagKey: 'food',
      title: 'OCR receipt draft',
      amount: '198000.00',
      transactionType: TransactionType.Expense,
      inputMethod: TransactionInputMethod.OCR,
      status: TransactionStatus.Draft,
      merchantName: 'Circle K',
    }),
    tx(referenceDate, 0, 28, {
      walletKey: 'cash',
      tagKey: 'transport',
      title: 'Voice parking note',
      amount: '30000.00',
      transactionType: TransactionType.Expense,
      inputMethod: TransactionInputMethod.Voice,
      status: TransactionStatus.Draft,
      merchantName: 'Parking Lot',
    }),
  );

  for (const monthOffset of [-5, -4, -3, -2, -1]) {
    rows.push(
      tx(referenceDate, monthOffset, 1, {
        walletKey: 'checking',
        tagKey: 'salary',
        title: 'Monthly salary',
        amount: '27500000.00',
        transactionType: TransactionType.Income,
        merchantName: 'FlowFi Labs',
      }),
      tx(referenceDate, monthOffset, 5, {
        walletKey: 'checking',
        tagKey: 'rent',
        title: 'Apartment rent',
        amount: '6500000.00',
        transactionType: TransactionType.Expense,
        merchantName: 'Landlord',
      }),
      tx(referenceDate, monthOffset, 8, {
        walletKey: 'cash',
        tagKey: 'groceries',
        title: 'Groceries and household items',
        amount: '1600000.00',
        transactionType: TransactionType.Expense,
        merchantName: 'Co.opmart',
      }),
      tx(referenceDate, monthOffset, 12, {
        walletKey: 'momo',
        tagKey: 'food',
        title: 'Restaurants and coffee',
        amount: '900000.00',
        transactionType: TransactionType.Expense,
        merchantName: 'Various',
      }),
      tx(referenceDate, monthOffset, 15, {
        walletKey: 'cash',
        tagKey: 'transport',
        title: 'Transport total',
        amount: '550000.00',
        transactionType: TransactionType.Expense,
        merchantName: 'Various',
      }),
      tx(referenceDate, monthOffset, 18, {
        walletKey: 'checking',
        tagKey: 'bills',
        title: 'Utilities bundle',
        amount: '1200000.00',
        transactionType: TransactionType.Expense,
        merchantName: 'Utilities',
      }),
      tx(referenceDate, monthOffset, 20, {
        walletKey: 'credit',
        tagKey: 'shopping',
        title: 'Monthly shopping',
        amount: '800000.00',
        transactionType: TransactionType.Expense,
        merchantName: 'Shopee',
      }),
      tx(referenceDate, monthOffset, 24, {
        walletKey: 'checking',
        tagKey: 'bonus',
        title: 'Project bonus',
        amount: '1200000.00',
        transactionType: TransactionType.Income,
        merchantName: 'FlowFi Labs',
      }),
    );
  }

  return rows;
}

function tx(
  referenceDate: Date,
  monthOffset: number,
  day: number,
  input: SeedTransactionInput,
): SeedTransaction {
  return {
    walletKey: input.walletKey,
    tagKey: input.tagKey,
    title: input.title,
    description: input.description ?? null,
    amount: input.amount,
    transactionType: input.transactionType,
    transactionDate: dateInMonth(referenceDate, monthOffset, day),
    inputMethod: input.inputMethod ?? TransactionInputMethod.Manual,
    status: input.status ?? TransactionStatus.Confirmed,
    merchantName: input.merchantName ?? null,
    clientId: `seed-transaction-${monthOffset}-${day}-${slug(input.title)}`,
  };
}

function goals(referenceDate: Date): SeedGoal[] {
  return [
    {
      walletKey: 'savings',
      name: 'Emergency fund',
      description: 'Three months of core expenses.',
      targetAmount: '80000000.00',
      currentAmount: '42000000.00',
      deadline: dateOnly(referenceDate, 5, 20),
      status: GoalStatus.Active,
    },
    {
      walletKey: 'savings',
      name: 'Da Nang family trip',
      description: 'Flights, hotel, and local budget.',
      targetAmount: '18000000.00',
      currentAmount: '9500000.00',
      deadline: dateOnly(referenceDate, 2, 15),
      status: GoalStatus.Active,
    },
    {
      walletKey: 'checking',
      name: 'New laptop',
      description: 'Work laptop replacement.',
      targetAmount: '35000000.00',
      currentAmount: '35000000.00',
      deadline: dateOnly(referenceDate, -1, 28),
      status: GoalStatus.Completed,
    },
    {
      walletKey: null,
      name: 'Professional course',
      description: 'Advanced finance analytics course.',
      targetAmount: '7000000.00',
      currentAmount: '2500000.00',
      deadline: dateOnly(referenceDate, 3, 10),
      status: GoalStatus.Active,
    },
    {
      walletKey: 'cash',
      name: 'Old bike upgrade',
      description: 'Cancelled after switching to public transit.',
      targetAmount: '12000000.00',
      currentAmount: '1000000.00',
      deadline: dateOnly(referenceDate, -2, 10),
      status: GoalStatus.Cancelled,
    },
  ];
}

function notifications(referenceDate: Date): SeedNotification[] {
  return [
    notification(
      referenceDate,
      0,
      27,
      'Monthly budget exceeded',
      NotificationType.BudgetWarning,
      false,
      {
        percentUsed: 127,
        month: monthInfo(referenceDate, 0).month,
      },
    ),
    notification(
      referenceDate,
      0,
      21,
      'Bills budget warning',
      NotificationType.BudgetWarning,
      false,
      {
        tagKey: 'bills',
        percentUsed: 94.62,
      },
    ),
    notification(
      referenceDate,
      0,
      18,
      'Goal progress updated',
      NotificationType.GoalReminder,
      true,
      {
        goalName: 'Emergency fund',
      },
    ),
    notification(
      referenceDate,
      0,
      15,
      'Refund recorded',
      NotificationType.Transaction,
      true,
      {
        amount: '250000.00',
      },
    ),
    notification(
      referenceDate,
      0,
      10,
      'Groceries budget exceeded',
      NotificationType.BudgetWarning,
      false,
      {
        tagKey: 'groceries',
        percentUsed: 110.5,
      },
    ),
    notification(
      referenceDate,
      0,
      7,
      'Freelance income received',
      NotificationType.Transaction,
      true,
      {
        amount: '4500000.00',
      },
    ),
    notification(
      referenceDate,
      0,
      3,
      'Welcome to FlowFi demo data',
      NotificationType.System,
      true,
      null,
    ),
    notification(
      referenceDate,
      -1,
      24,
      'Project bonus received',
      NotificationType.Transaction,
      true,
      {
        amount: '1200000.00',
      },
    ),
    notification(
      referenceDate,
      -1,
      20,
      'Shopping budget looks healthy',
      NotificationType.System,
      true,
      {
        tagKey: 'shopping',
      },
    ),
    notification(
      referenceDate,
      -1,
      15,
      'Transport spending summary ready',
      NotificationType.System,
      true,
      {
        tagKey: 'transport',
      },
    ),
    notification(
      referenceDate,
      -2,
      10,
      'Laptop goal completed',
      NotificationType.GoalReminder,
      true,
      {
        goalName: 'New laptop',
      },
    ),
    notification(
      referenceDate,
      -2,
      5,
      'Security reminder',
      NotificationType.System,
      false,
      {
        action: 'review-devices',
      },
    ),
  ];
}

function notification(
  referenceDate: Date,
  monthOffset: number,
  day: number,
  title: string,
  notificationType: NotificationType,
  isRead: boolean,
  metadata: Record<string, unknown> | null,
): SeedNotification {
  return {
    title,
    content: `${title} in the demo account.`,
    notificationType,
    metadata,
    isRead,
    createdAt: dateInMonth(referenceDate, monthOffset, day, 9, 30),
  };
}

function aiRequests(referenceDate: Date): SeedAiRequest[] {
  return [
    {
      key: 'receipt-highlands',
      inputType: AiInputType.Image,
      requestType: AiRequestType.Ocr,
      inputUrl: 'local://seed/receipts/highlands.jpg',
      status: AiRequestStatus.Completed,
      errorMessage: null,
      metadata: { imageType: 'RECEIPT', source: 'seed' },
      createdAt: dateInMonth(referenceDate, 0, 5, 8, 15),
    },
    {
      key: 'voice-parking',
      inputType: AiInputType.Audio,
      requestType: AiRequestType.VoiceToTransaction,
      inputUrl: 'local://seed/voices/parking.m4a',
      status: AiRequestStatus.Completed,
      errorMessage: null,
      metadata: { language: 'vi-VN', source: 'seed' },
      createdAt: dateInMonth(referenceDate, 0, 12, 18, 40),
    },
    {
      key: 'receipt-processing',
      inputType: AiInputType.Image,
      requestType: AiRequestType.Ocr,
      inputUrl: 'local://seed/receipts/co-opmart.jpg',
      status: AiRequestStatus.Processing,
      errorMessage: null,
      metadata: { source: 'seed' },
      createdAt: dateInMonth(referenceDate, 0, 28, 20, 10),
    },
    {
      key: 'monthly-analysis',
      inputType: AiInputType.Text,
      requestType: AiRequestType.SpendingAnalysis,
      inputUrl: null,
      status: AiRequestStatus.Pending,
      errorMessage: null,
      metadata: { month: monthInfo(referenceDate, 0).month, source: 'seed' },
      createdAt: dateInMonth(referenceDate, 0, 28, 21, 0),
    },
    {
      key: 'failed-bank-slip',
      inputType: AiInputType.Image,
      requestType: AiRequestType.Ocr,
      inputUrl: 'local://seed/receipts/blurred-bank-slip.jpg',
      status: AiRequestStatus.Failed,
      errorMessage: 'Image is too blurred to read a transaction amount.',
      metadata: { source: 'seed' },
      createdAt: dateInMonth(referenceDate, -1, 19, 12, 0),
    },
  ];
}

function aiResults(referenceDate: Date): SeedAiResult[] {
  return [
    {
      requestKey: 'receipt-highlands',
      amount: '85000.00',
      transactionType: AiTransactionType.Expense,
      tag: AiTag.Food,
      transactionDate: dateInMonth(referenceDate, 0, 5, 8, 20),
      confidence: '0.9300',
      rawResponse: '{"merchantName":"Highlands Coffee","amount":85000}',
      parsedData: {
        imageType: 'RECEIPT',
        merchantName: 'Highlands Coffee',
        title: 'Team coffee',
        amount: 85000,
        tag: AiTag.Food,
      },
    },
    {
      requestKey: 'voice-parking',
      amount: '30000.00',
      transactionType: AiTransactionType.Expense,
      tag: AiTag.Transport,
      transactionDate: dateInMonth(referenceDate, 0, 12, 18, 42),
      confidence: '0.8900',
      rawResponse: 'Paid 30k for parking this evening.',
      parsedData: {
        inputType: AiInputType.Voice,
        title: 'Voice parking note',
        amount: 30000,
        tag: AiTag.Transport,
      },
    },
  ];
}

function monthInfo(referenceDate: Date, monthOffset: number) {
  const date = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() + monthOffset,
      1,
    ),
  );
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function dateInMonth(
  referenceDate: Date,
  monthOffset: number,
  day: number,
  hour = 8,
  minute = 0,
): Date {
  const info = monthInfo(referenceDate, monthOffset);
  const currentLimit =
    monthOffset === 0
      ? Math.max(1, Math.min(referenceDate.getUTCDate(), 28))
      : 28;
  const safeDay = Math.max(1, Math.min(day, currentLimit));

  return new Date(
    Date.UTC(info.year, info.month - 1, safeDay, hour, minute, 0),
  );
}

function dateOnly(
  referenceDate: Date,
  monthOffset: number,
  day: number,
): string {
  return dateInMonth(referenceDate, monthOffset, day)
    .toISOString()
    .slice(0, 10);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
