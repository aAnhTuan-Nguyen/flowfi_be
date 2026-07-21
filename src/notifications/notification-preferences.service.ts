import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

const DEFAULTS: Partial<NotificationPreference> = {
  transactionNotifications: true,
  budgetWarning: true,
  dailyReminder: true,
  dailyReminderHour: 20,
  weeklySummary: true,
  monthlySummary: true,
  savingsTip: true,
  timezone: 'Asia/Ho_Chi_Minh',
};

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferencesRepository: Repository<NotificationPreference>,
  ) {}

  async getOrCreate(userId: string): Promise<NotificationPreference> {
    const existing = await this.preferencesRepository.findOne({
      where: { userId },
    });
    if (existing) return existing;
    return this.preferencesRepository.save(
      this.preferencesRepository.create({ userId, ...DEFAULTS }),
    );
  }

  async update(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    const current = await this.getOrCreate(userId);
    Object.assign(current, dto);
    return this.preferencesRepository.save(current);
  }

  async isEnabled(
    userId: string,
    preferenceKey:
      | 'transactionNotifications'
      | 'budgetWarning'
      | 'dailyReminder'
      | 'weeklySummary'
      | 'monthlySummary'
      | 'savingsTip',
  ): Promise<boolean> {
    const pref = await this.preferencesRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        transactionNotifications: true,
        budgetWarning: true,
        dailyReminder: true,
        weeklySummary: true,
        monthlySummary: true,
        savingsTip: true,
      },
    });
    if (!pref) return DEFAULTS[preferenceKey] ?? true;
    return pref[preferenceKey];
  }
}