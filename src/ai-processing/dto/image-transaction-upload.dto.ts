import { IsUUID } from 'class-validator';

export class ImageTransactionUploadDto {
  @IsUUID()
  WalletId!: string;
}
