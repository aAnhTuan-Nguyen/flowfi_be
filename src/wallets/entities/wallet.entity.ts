import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SyncableEntity } from '../../database/entities/syncable.entity';
import { User } from '../../users/entities/user.entity';
import { WalletType } from '../wallet.enums';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('wallets')
export class Wallet extends SyncableEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.wallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'wallet_type', type: 'varchar', length: 50 })
  walletType!: WalletType;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  balance!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions!: Transaction[];
}
