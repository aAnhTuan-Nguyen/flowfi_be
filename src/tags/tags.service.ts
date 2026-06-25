import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ErrorCode } from '../common/errors/error-code.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginated } from '../common/utils/pagination';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  async create(userId: string, dto: CreateTagDto): Promise<Tag> {
    return this.tagsRepository.save(
      this.tagsRepository.create({
        userId,
        name: dto.name,
        type: dto.type,
        clientId: dto.clientId ?? null,
        isDefault: false,
      }),
    );
  }

  async findAll(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.tagsRepository.findAndCount({
      where: [{ userId }, { userId: IsNull(), isDefault: true }],
      order: { isDefault: 'DESC', name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async findAccessible(userId: string, id: string): Promise<Tag> {
    const tag = await this.tagsRepository.findOne({
      where: [
        { id, userId },
        { id, userId: IsNull(), isDefault: true },
      ],
    });
    if (!tag) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Tag not found',
      });
    }
    return tag;
  }

  async update(userId: string, id: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findAccessible(userId, id);
    if (tag.isDefault || tag.userId === null) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'Default tags are read-only',
      });
    }
    Object.assign(tag, dto);
    return this.tagsRepository.save(tag);
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    const tag = await this.findAccessible(userId, id);
    if (tag.isDefault || tag.userId === null) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'Default tags are read-only',
      });
    }
    await this.tagsRepository.softDelete({ id, userId });
    return { deleted: true };
  }
}
