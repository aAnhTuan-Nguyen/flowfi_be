import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ErrorCode } from '../common/errors/error-code.enum';
import { paginated } from '../common/utils/pagination';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(
    userId: string,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationsRepository.save(
      this.notificationsRepository.create({
        userId,
        title: dto.title,
        content: dto.content ?? null,
        notificationType: dto.notificationType,
      }),
    );
  }

  async findAll(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.notificationsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Notification not found',
      });
    }
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllRead(userId: string): Promise<{ updated: boolean }> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: true };
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    const result = await this.notificationsRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Notification not found',
      });
    }
    return { deleted: true };
  }
}
