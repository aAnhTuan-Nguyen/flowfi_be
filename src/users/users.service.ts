import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/errors/error-code.enum';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findMe(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'User not found',
      });
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findMe(userId);
    Object.assign(user, {
      fullName: dto.fullName ?? user.fullName,
      avatarUrl: dto.avatarUrl ?? user.avatarUrl,
      dateOfBirth: dto.dateOfBirth ?? user.dateOfBirth,
      currencyCode: dto.currencyCode ?? user.currencyCode,
      monthlyBudgetLimit: dto.monthlyBudgetLimit ?? user.monthlyBudgetLimit,
    });
    return this.usersRepository.save(user);
  }

  async deleteMe(userId: string): Promise<{ deleted: boolean }> {
    await this.usersRepository.softDelete({ id: userId });
    return { deleted: true };
  }
}
