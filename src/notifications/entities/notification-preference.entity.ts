import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'transaction_notifications', type: 'boolean', default: true })
  transactionNotifications!: boolean;

  @Column({ name: 'budget_warning', type: 'boolean', default: true })
  budgetWarning!: boolean;

  @Column({ name: 'daily_reminder', type: 'boolean', default: true })
  dailyReminder!: boolean;

  @Column({ name: 'daily_reminder_hour', type: 'int', default: 20 })
  dailyReminderHour!: number;

  @Column({ name: 'weekly_summary', type: 'boolean', default: true })
  weeklySummary!: boolean;

  @Column({ name: 'monthly_summary', type: 'boolean', default: true })
  monthlySummary!: boolean;

  @Column({ name: 'savings_tip', type: 'boolean', default: true })
  savingsTip!: boolean;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Ho_Chi_Minh' })
  timezone!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt!: Date | null;
}