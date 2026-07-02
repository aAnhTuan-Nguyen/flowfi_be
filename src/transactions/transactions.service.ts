import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ErrorCode } from '../common/errors/error-code.enum';
import { addMoney, subtractMoney } from '../common/utils/money';
import { paginated } from '../common/utils/pagination';
import { BudgetProgressService } from '../budgets/budget-progress.service';
import { Tag } from '../tags/entities/tag.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';
import { transactionBalanceEffect } from './transaction-balance';
import {
  TransactionInputMethod,
  TransactionStatus,
  TransactionType,
} from './transaction.enums';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly budgetProgressService?: BudgetProgressService,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const wallet = await this.findWallet(userId, dto.walletId);
      await this.findTag(userId, dto.tagId);
      const transaction = manager.create(Transaction, {
        walletId: dto.walletId,
        tagId: dto.tagId,
        title: dto.title,
        description: dto.description ?? null,
        amount: dto.amount,
        transactionType: dto.transactionType,
        transactionDate: new Date(dto.transactionDate),
        inputMethod: dto.inputMethod ?? TransactionInputMethod.Manual,
        status: dto.status ?? TransactionStatus.Confirmed,
        merchantName: dto.merchantName ?? null,
        clientId: dto.clientId ?? null,
      });
      const saved = await manager.save(transaction);
      wallet.balance = addMoney(
        wallet.balance,
        transactionBalanceEffect(
          saved.amount,
          saved.transactionType,
          saved.status,
        ),
      );
      await manager.save(wallet);
      return saved;
    });
    await this.checkBudgetAlert(userId, saved);
    return saved;
  }

  async findAll(userId: string, query: TransactionQueryDto) {
    const walletIds = await this.walletIdsForUser(userId);
    const where: FindOptionsWhere<Transaction> = {
      walletId: query.walletId ?? undefined,
      tagId: query.tagId,
      transactionType: query.transactionType,
    };

    if (!query.walletId) {
      where.walletId = walletIds.length > 0 ? undefined : 'no-wallets';
    } else {
      await this.findWallet(userId, query.walletId);
    }

    if (query.from && query.to) {
      where.transactionDate = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.transactionDate = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.transactionDate = LessThanOrEqual(new Date(query.to));
    }

    const queryBuilder = this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .leftJoinAndSelect('transaction.tag', 'tag')
      .where('wallet.user_id = :userId', { userId })
      .orderBy('transaction.transaction_date', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.walletId)
      queryBuilder.andWhere('transaction.wallet_id = :walletId', {
        walletId: query.walletId,
      });
    if (query.tagId)
      queryBuilder.andWhere('transaction.tag_id = :tagId', {
        tagId: query.tagId,
      });
    if (query.transactionType) {
      queryBuilder.andWhere('transaction.transaction_type = :transactionType', {
        transactionType: query.transactionType,
      });
    }
    if (query.status) {
      queryBuilder.andWhere('transaction.status = :status', {
        status: query.status,
      });
    }
    if (query.inputMethod) {
      queryBuilder.andWhere('transaction.input_method = :inputMethod', {
        inputMethod: query.inputMethod,
      });
    }
    const keyword = query.keyword?.trim();
    if (keyword) {
      queryBuilder.andWhere(
        '(transaction.title ILIKE :keyword OR transaction.description ILIKE :keyword OR transaction.merchant_name ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    if (query.from)
      queryBuilder.andWhere('transaction.transaction_date >= :from', {
        from: query.from,
      });
    if (query.to)
      queryBuilder.andWhere('transaction.transaction_date <= :to', {
        to: query.to,
      });

    const [items, total] = await queryBuilder.getManyAndCount();
    return paginated(items, query.page, query.limit, total);
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .leftJoinAndSelect('transaction.tag', 'tag')
      .where('transaction.id = :id', { id })
      .andWhere('wallet.user_id = :userId', { userId })
      .getOne();
    if (!transaction) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Transaction not found',
      });
    }
    return transaction;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const transaction = await this.findOne(userId, id);
      const oldWallet = await this.findWallet(userId, transaction.walletId);
      const oldEffect = transactionBalanceEffect(
        transaction.amount,
        transaction.transactionType,
        transaction.status,
      );

      if (dto.tagId) await this.findTag(userId, dto.tagId);

      Object.assign(transaction, {
        tagId: dto.tagId ?? transaction.tagId,
        title: dto.title ?? transaction.title,
        description: dto.description ?? transaction.description,
        amount: dto.amount ?? transaction.amount,
        transactionType: dto.transactionType ?? transaction.transactionType,
        transactionDate: dto.transactionDate
          ? new Date(dto.transactionDate)
          : transaction.transactionDate,
        merchantName: dto.merchantName ?? transaction.merchantName,
        version: transaction.version + 1,
      });

      const saved = await manager.save(transaction);
      oldWallet.balance = subtractMoney(oldWallet.balance, oldEffect);
      oldWallet.balance = addMoney(
        oldWallet.balance,
        transactionBalanceEffect(
          saved.amount,
          saved.transactionType,
          saved.status,
        ),
      );
      await manager.save(oldWallet);
      return saved;
    });
    await this.checkBudgetAlert(userId, updated);
    return updated;
  }

  async confirm(userId: string, id: string): Promise<Transaction> {
    const current = await this.findOne(userId, id);
    if (current.status === TransactionStatus.Confirmed) {
      return current;
    }

    const confirmed = await this.dataSource.transaction(async (manager) => {
      const transaction = await this.findOne(userId, id);
      if (transaction.status === TransactionStatus.Confirmed) {
        return transaction;
      }

      const wallet = await this.findWallet(userId, transaction.walletId);
      const oldEffect = transactionBalanceEffect(
        transaction.amount,
        transaction.transactionType,
        transaction.status,
      );

      transaction.status = TransactionStatus.Confirmed;
      transaction.version += 1;
      const saved = await manager.save(transaction);

      wallet.balance = subtractMoney(wallet.balance, oldEffect);
      wallet.balance = addMoney(
        wallet.balance,
        transactionBalanceEffect(
          saved.amount,
          saved.transactionType,
          saved.status,
        ),
      );
      await manager.save(wallet);
      return saved;
    });
    await this.checkBudgetAlert(userId, confirmed);
    return confirmed;
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await this.findOne(userId, id);
      const wallet = await this.findWallet(userId, transaction.walletId);
      wallet.balance = subtractMoney(
        wallet.balance,
        transactionBalanceEffect(
          transaction.amount,
          transaction.transactionType,
          transaction.status,
        ),
      );
      await manager.save(wallet);
      await manager.softDelete(Transaction, { id: transaction.id });
      return { deleted: true };
    });
  }

  private async findWallet(userId: string, walletId: string): Promise<Wallet> {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId, userId },
    });
    if (!wallet)
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Wallet not found',
      });
    return wallet;
  }

  private async findTag(userId: string, tagId: string): Promise<Tag> {
    const tag = await this.tagsRepository
      .createQueryBuilder('tag')
      .where('tag.id = :tagId', { tagId })
      .andWhere(
        '(tag.user_id = :userId OR (tag.user_id IS NULL AND tag.is_default = true))',
        { userId },
      )
      .getOne();
    if (!tag)
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Tag not found',
      });
    return tag;
  }

  private async walletIdsForUser(userId: string): Promise<string[]> {
    const wallets = await this.walletsRepository.find({
      where: { userId },
      select: { id: true },
    });
    return wallets.map((wallet) => wallet.id);
  }

  private async checkBudgetAlert(
    userId: string,
    transaction: Transaction,
  ): Promise<void> {
    if (
      transaction.status !== TransactionStatus.Confirmed ||
      transaction.transactionType !== TransactionType.Expense
    ) {
      return;
    }

    await this.budgetProgressService?.checkAndCreateAlertsForTransaction({
      userId,
      tagId: transaction.tagId,
      transactionDate: transaction.transactionDate,
    });
  }
}
