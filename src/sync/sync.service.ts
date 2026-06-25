import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { Budget } from '../budgets/entities/budget.entity';
import { AppConfig } from '../config/env.validation';
import { ErrorCode } from '../common/errors/error-code.enum';
import { Goal } from '../goals/entities/goal.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { SyncPushDto, SyncPushItemDto } from './dto/sync-push.dto';
import { SyncPullQueryDto } from './dto/sync-pull-query.dto';
import { SyncConflict } from './entities/sync-conflict.entity';
import { SyncQueue } from './entities/sync-queue.entity';
import { UserDevice } from './entities/user-device.entity';
import { ConflictStatus, SyncAction, SyncStatus } from './sync.enums';

type SyncEntity = Wallet | Tag | Budget | Goal | Transaction;

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(UserDevice)
    private readonly devicesRepository: Repository<UserDevice>,
    @InjectRepository(SyncQueue)
    private readonly queueRepository: Repository<SyncQueue>,
    @InjectRepository(SyncConflict)
    private readonly conflictsRepository: Repository<SyncConflict>,
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Goal)
    private readonly goalsRepository: Repository<Goal>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<UserDevice> {
    const existing = await this.devicesRepository.findOne({
      where: { userId, deviceId: dto.deviceId },
    });
    const device =
      existing ??
      this.devicesRepository.create({ userId, deviceId: dto.deviceId });
    device.deviceName = dto.deviceName ?? device.deviceName ?? null;
    device.platform = dto.platform ?? device.platform ?? null;
    device.pushToken = dto.pushToken ?? device.pushToken ?? null;
    device.lastSyncedAt = new Date();
    return this.devicesRepository.save(device);
  }

  async pull(userId: string, query: SyncPullQueryDto) {
    const since = query.since ? new Date(query.since) : new Date(0);
    const where = { userId, updatedAt: MoreThanOrEqual(since) };
    const [wallets, tags, budgets, goals] = await Promise.all([
      this.walletsRepository.find({ where, withDeleted: true }),
      this.tagsRepository.find({
        where: [{ userId, updatedAt: MoreThanOrEqual(since) }],
        withDeleted: true,
      }),
      this.budgetsRepository.find({ where, withDeleted: true }),
      this.goalsRepository.find({ where, withDeleted: true }),
    ]);
    const transactions = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .withDeleted()
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.user_id = :userId', { userId })
      .andWhere('transaction.updated_at >= :since', { since })
      .getMany();

    return {
      serverTime: new Date().toISOString(),
      changes: { wallets, tags, transactions, budgets, goals },
    };
  }

  async push(userId: string, dto: SyncPushDto) {
    const maxBatchSize =
      this.configService.get('syncMaxBatchSize', { infer: true }) ?? 100;
    if (dto.items.length > maxBatchSize) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: `Sync batch cannot exceed ${maxBatchSize} items`,
      });
    }

    const results: Array<Record<string, unknown>> = [];
    for (const item of dto.items) {
      results.push(
        await this.applyPushItem(userId, dto.deviceUuid ?? null, item),
      );
    }

    return { results };
  }

  async conflicts(userId: string) {
    return this.conflictsRepository.find({
      where: { userId, status: ConflictStatus.Pending },
      order: { createdAt: 'DESC' },
    });
  }

  async resolveConflict(
    userId: string,
    id: string,
    dto: ResolveConflictDto,
  ): Promise<SyncConflict> {
    const conflict = await this.conflictsRepository.findOne({
      where: { id, userId },
    });
    if (!conflict) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Sync conflict not found',
      });
    }
    conflict.status = ConflictStatus.Resolved;
    conflict.resolution = dto.resolution;
    conflict.resolvedAt = new Date();
    return this.conflictsRepository.save(conflict);
  }

  private async applyPushItem(
    userId: string,
    deviceId: string | null,
    item: SyncPushItemDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const serverEntity = await this.findServerEntity(userId, item);

      if (serverEntity && item.version && item.version < serverEntity.version) {
        const conflict = await manager.save(
          manager.create(SyncConflict, {
            userId,
            deviceId,
            entityName: item.entityName,
            entityId: item.entityId ?? serverEntity.id,
            clientId: item.clientId ?? null,
            localPayload: item.payload,
            serverPayload: serverEntity as unknown as Record<string, unknown>,
            status: ConflictStatus.Pending,
          }),
        );
        return {
          entityName: item.entityName,
          clientId: item.clientId,
          status: SyncStatus.Conflict,
          conflictId: conflict.id,
        };
      }

      const saved = await this.applyEntityMutation(userId, item, serverEntity);
      await manager.save(
        manager.create(SyncQueue, {
          userId,
          deviceId,
          entityName: item.entityName,
          entityId: saved?.id ?? item.entityId ?? null,
          clientId: item.clientId ?? null,
          action: item.action,
          payload: item.payload,
          syncStatus: SyncStatus.Synced,
          syncedAt: new Date(),
        }),
      );

      return {
        entityName: item.entityName,
        clientId: item.clientId,
        entityId: saved?.id ?? item.entityId ?? null,
        status: SyncStatus.Synced,
        version: saved?.version,
      };
    });
  }

  private async applyEntityMutation(
    userId: string,
    item: SyncPushItemDto,
    serverEntity: SyncEntity | null,
  ): Promise<SyncEntity | null> {
    const repository = this.repositoryFor(item.entityName);

    if (item.action === SyncAction.Delete) {
      if (serverEntity) await repository.softDelete({ id: serverEntity.id });
      return serverEntity;
    }

    const base =
      serverEntity ??
      repository.create({ userId, clientId: item.clientId ?? null });
    Object.assign(base, item.payload, {
      userId: 'userId' in base ? userId : undefined,
      clientId: item.clientId ?? base.clientId ?? null,
      version: serverEntity ? serverEntity.version + 1 : 1,
      syncStatus: SyncStatus.Synced,
      lastSyncedAt: new Date(),
    });

    return repository.save(base);
  }

  private repositoryFor(entityName: string): Repository<SyncEntity> {
    switch (entityName) {
      case 'wallets':
        return this.walletsRepository;
      case 'tags':
        return this.tagsRepository;
      case 'budgets':
        return this.budgetsRepository;
      case 'goals':
        return this.goalsRepository;
      case 'transactions':
        return this.transactionsRepository;
      default:
        throw new BadRequestException({
          code: ErrorCode.BadRequest,
          message: 'Unsupported sync entity',
        });
    }
  }

  private async findServerEntity(
    userId: string,
    item: SyncPushItemDto,
  ): Promise<SyncEntity | null> {
    const repository = this.repositoryFor(item.entityName);
    const idWhere = item.entityId ? { id: item.entityId } : undefined;
    const clientWhere = item.clientId ? { clientId: item.clientId } : undefined;
    const candidate = idWhere
      ? await repository.findOne({ where: idWhere, withDeleted: true })
      : clientWhere
        ? await repository.findOne({
            where: clientWhere,
            withDeleted: true,
          })
        : null;

    if (!candidate) return null;
    if (item.entityName === 'transactions') {
      const transaction = await this.transactionsRepository.findOne({
        where: { id: candidate.id },
        relations: { wallet: true },
      });
      return transaction?.wallet.userId === userId ? candidate : null;
    }

    return 'userId' in candidate && candidate.userId === userId
      ? candidate
      : null;
  }
}
