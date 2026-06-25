import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ErrorCode } from '../common/errors/error-code.enum';
import { paginated } from '../common/utils/pagination';
import { Tag } from '../tags/entities/tag.entity';
import { Budget } from './entities/budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    if (dto.tagId) await this.findTag(userId, dto.tagId);
    return this.budgetsRepository.save(
      this.budgetsRepository.create({
        userId,
        tagId: dto.tagId ?? null,
        budgetAmount: dto.budgetAmount,
        month: dto.month,
        year: dto.year,
        warningThresholdPercent: dto.warningThresholdPercent ?? 80,
      }),
    );
  }

  async findAll(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.budgetsRepository.findAndCount({
      where: { userId },
      relations: { tag: true },
      order: { year: 'DESC', month: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async findOne(userId: string, id: string): Promise<Budget> {
    const budget = await this.budgetsRepository.findOne({
      where: { id, userId },
      relations: { tag: true },
    });
    if (!budget)
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Budget not found',
      });
    return budget;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<Budget> {
    const budget = await this.findOne(userId, id);
    if (dto.tagId) await this.findTag(userId, dto.tagId);
    Object.assign(budget, {
      tagId: dto.tagId ?? budget.tagId,
      budgetAmount: dto.budgetAmount ?? budget.budgetAmount,
      month: dto.month ?? budget.month,
      year: dto.year ?? budget.year,
      warningThresholdPercent:
        dto.warningThresholdPercent ?? budget.warningThresholdPercent,
      version: budget.version + 1,
    });
    return this.budgetsRepository.save(budget);
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findOne(userId, id);
    await this.budgetsRepository.softDelete({ id, userId });
    return { deleted: true };
  }

  private async findTag(userId: string, tagId: string): Promise<Tag> {
    const tag = await this.tagsRepository
      .createQueryBuilder('tag')
      .where('tag.id = :tagId', { tagId })
      .andWhere(
        '(tag.user_id = :userId OR (tag.user_id IS NULL AND tag.is_default = true))',
        { userId },
      )
      .getOne();
    if (!tag)
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Tag not found',
      });
    return tag;
  }
}
