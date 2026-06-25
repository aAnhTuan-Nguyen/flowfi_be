import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ErrorCode } from '../common/errors/error-code.enum';
import { paginated } from '../common/utils/pagination';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalProgressDto } from './dto/update-goal-progress.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { Goal } from './entities/goal.entity';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalsRepository: Repository<Goal>,
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
  ) {}

  async create(userId: string, dto: CreateGoalDto): Promise<Goal> {
    if (dto.walletId) await this.findWallet(userId, dto.walletId);
    return this.goalsRepository.save(
      this.goalsRepository.create({
        userId,
        walletId: dto.walletId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount ?? '0.00',
        deadline: dto.deadline ?? null,
        status: dto.status,
      }),
    );
  }

  async findAll(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.goalsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async findOne(userId: string, id: string): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({ where: { id, userId } });
    if (!goal)
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Goal not found',
      });
    return goal;
  }

  async update(userId: string, id: string, dto: UpdateGoalDto): Promise<Goal> {
    const goal = await this.findOne(userId, id);
    if (dto.walletId) await this.findWallet(userId, dto.walletId);
    Object.assign(goal, {
      walletId: dto.walletId ?? goal.walletId,
      name: dto.name ?? goal.name,
      description: dto.description ?? goal.description,
      targetAmount: dto.targetAmount ?? goal.targetAmount,
      currentAmount: dto.currentAmount ?? goal.currentAmount,
      deadline: dto.deadline ?? goal.deadline,
      status: dto.status ?? goal.status,
      version: goal.version + 1,
    });
    return this.goalsRepository.save(goal);
  }

  async updateProgress(
    userId: string,
    id: string,
    dto: UpdateGoalProgressDto,
  ): Promise<Goal> {
    return this.update(userId, id, { currentAmount: dto.currentAmount });
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findOne(userId, id);
    await this.goalsRepository.softDelete({ id, userId });
    return { deleted: true };
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
}
