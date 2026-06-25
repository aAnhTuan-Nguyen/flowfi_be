import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SyncableEntity } from '../../database/entities/syncable.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Tag } from '../../tags/entities/tag.entity';
import {
  TransactionInputMethod,
  TransactionStatus,
  TransactionType,
} from '../transaction.enums';

@Entity('transactions')
export class Transaction extends SyncableEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @Column({ name: 'tag_id', type: 'uuid' })
  tagId!: string;

  @ManyToOne(() => Tag, (tag) => tag.transactions)
  @JoinColumn({ name: 'tag_id' })
  tag!: Tag;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: string;

  @Column({ name: 'transaction_type', type: 'varchar', length: 20 })
  transactionType!: TransactionType;

  @Column({ name: 'transaction_date', type: 'timestamptz' })
  transactionDate!: Date;

  @Column({
    name: 'input_method',
    type: 'varchar',
    length: 20,
    default: TransactionInputMethod.Manual,
  })
  inputMethod!: TransactionInputMethod;

  @Column({ type: 'varchar', length: 20, default: TransactionStatus.Confirmed })
  status!: TransactionStatus;

  @Column({
    name: 'merchant_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  merchantName!: string | null;
}
