import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import {
  NotificationPreferenceKey,
  NotificationType,
} from './notification.enums';
import { NotificationTemplates } from './notification.templates';
import { NotificationPreferencesService } from './notification-preferences.service';

export interface DispatchNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @Optional()
    private readonly preferencesService?: NotificationPreferencesService,
  ) {}

  async dispatch(input: DispatchNotificationInput): Promise<Notification | null> {
    const key = NotificationTemplates.preferenceKeyForType(input.type);
    if (this.preferencesService) {
      const enabled = await this.preferencesService.isEnabled(
        input.userId,
        key as
          | 'transactionNotifications'
          | 'budgetWarning'
          | 'dailyReminder'
          | 'weeklySummary'
          | 'monthlySummary'
          | 'savingsTip',
      );
      if (!enabled) {
        return null;
      }
    }

    const notification = await this.notificationsRepository.save(
      this.notificationsRepository.create({
        userId: input.userId,
        title: input.title,
        content: input.content,
        notificationType: input.type,
        metadata: input.metadata ?? null,
      }),
    );

    this.logger.log(
      `Notification dispatched userId=${input.userId} type=${input.type} id=${notification.id}`,
    );

    return notification;
  }

  async dispatchMany(
    inputs: DispatchNotificationInput[],
  ): Promise<(Notification | null)[]> {
    return Promise.all(inputs.map((input) => this.dispatch(input)));
  }
}