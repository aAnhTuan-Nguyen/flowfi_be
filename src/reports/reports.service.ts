import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addMoney } from '../common/utils/money';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async summary(userId: string, query: ReportQueryDto) {
    const rows = await this.filteredQuery(userId, query)
      .select('transaction.transaction_type', 'type')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
      .groupBy('transaction.transaction_type')
      .getRawMany<{ type: TransactionType; total: string }>();

    const income =
      rows.find((row) => row.type === TransactionType.Income)?.total ?? '0.00';
    const expense =
      rows.find((row) => row.type === TransactionType.Expense)?.total ?? '0.00';

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: addMoney(income, `-${expense}`),
    };
  }

  async categories(userId: string, query: ReportQueryDto) {
    return this.filteredQuery(userId, query)
      .leftJoin('transaction.tag', 'tag')
      .select('tag.id', 'tagId')
      .addSelect('tag.name', 'tagName')
      .addSelect('transaction.transaction_type', 'transactionType')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
      .groupBy('tag.id')
      .addGroupBy('tag.name')
      .addGroupBy('transaction.transaction_type')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  async cashflow(userId: string, query: ReportQueryDto) {
    return this.filteredQuery(userId, query)
      .select("DATE_TRUNC('day', transaction.transaction_date)", 'date')
      .addSelect('transaction.transaction_type', 'transactionType')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
      .groupBy("DATE_TRUNC('day', transaction.transaction_date)")
      .addGroupBy('transaction.transaction_type')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  private filteredQuery(userId: string, query: ReportQueryDto) {
    const builder = this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.user_id = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.Confirmed,
      });

    if (query.walletId)
      builder.andWhere('transaction.wallet_id = :walletId', {
        walletId: query.walletId,
      });
    if (query.from)
      builder.andWhere('transaction.transaction_date >= :from', {
        from: query.from,
      });
    if (query.to)
      builder.andWhere('transaction.transaction_date <= :to', { to: query.to });

    return builder;
  }
}
