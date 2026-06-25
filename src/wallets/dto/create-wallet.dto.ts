import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { WalletType } from '../wallet.enums';

export class CreateWalletDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEnum(WalletType)
  walletType!: WalletType;

  @IsOptional()
  @Matches(/^-?\d+(\.\d{1,2})?$/)
  balance?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}
