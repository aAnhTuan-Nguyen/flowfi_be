import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { NotificationDispatcher } from './notification.dispatcher';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationScheduler } from './notification.scheduler';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Notification, NotificationPreference, User, Transaction, Tag]),
  ],
  controllers: [
    NotificationsController,
    NotificationPreferencesController,
  ],
  providers: [
    NotificationsService,
    NotificationDispatcher,
    NotificationPreferencesService,
    NotificationScheduler,
  ],
  exports: [
    NotificationsService,
    NotificationDispatcher,
    NotificationPreferencesService,
  ],
})
export class NotificationsModule {}