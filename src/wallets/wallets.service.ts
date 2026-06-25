import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/errors/error-code.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginated } from '../common/utils/pagination';
import { Wallet } from './entities/wallet.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
  ) {}

  async create(userId: string, dto: CreateWalletDto): Promise<Wallet> {
    const existingCount = await this.walletsRepository.count({
      where: { userId },
    });
    const wallet = this.walletsRepository.create({
      userId,
      name: dto.name,
      walletType: dto.walletType,
      balance: dto.balance ?? '0.00',
      clientId: dto.clientId ?? null,
      isDefault: existingCount === 0,
    });
    return this.walletsRepository.save(wallet);
  }

  async findAll(userId: string, query: PaginationQueryDto) {
    const [items, total] = await this.walletsRepository.findAndCount({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async findOne(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.walletsRepository.findOne({
      where: { id, userId },
    });
    if (!wallet) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Wallet not found',
      });
    }
    return wallet;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateWalletDto,
  ): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);
    Object.assign(wallet, dto);
    return this.walletsRepository.save(wallet);
  }

  async setDefault(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);
    await this.walletsRepository.update({ userId }, { isDefault: false });
    wallet.isDefault = true;
    return this.walletsRepository.save(wallet);
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findOne(userId, id);
    await this.walletsRepository.softDelete({ id, userId });
    return { deleted: true };
  }
}
