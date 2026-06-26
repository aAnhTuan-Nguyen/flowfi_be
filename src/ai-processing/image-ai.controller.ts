import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/request-with-user.interface';
import { AiProcessingService } from './ai-processing.service';
import { ImageTransactionUploadDto } from './dto/image-transaction-upload.dto';

@Controller('ai-processing/images')
export class ImageAiController {
  constructor(private readonly aiProcessingService: AiProcessingService) {}

  @Post('transactions')
  @UseInterceptors(AnyFilesInterceptor())
  createTransactions(
    @CurrentUser() user: JwtUser,
    @UploadedFiles() files: any[],
    @Body() dto: ImageTransactionUploadDto,
  ) {
    return this.aiProcessingService.createTransactionsFromImage(
      user.id,
      dto.WalletId,
      this.pickFile(files, 'Image'),
    );
  }

  private pickFile(files: any[] | undefined, fieldName: string) {
    return files?.find(
      (file) =>
        typeof file.fieldname === 'string' &&
        file.fieldname.trim().toLowerCase() === fieldName.toLowerCase(),
    );
  }
}
