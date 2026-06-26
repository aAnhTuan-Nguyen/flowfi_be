import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/request-with-user.interface';
import { AiProcessingService } from './ai-processing.service';
import { VoiceTransactionUploadDto } from './dto/voice-transaction-upload.dto';

@Controller('ai-processing/voices')
export class VoiceAiController {
  constructor(private readonly aiProcessingService: AiProcessingService) {}

  @Post('transcriptions')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AnyFilesInterceptor())
  transcribe(@CurrentUser() user: JwtUser, @UploadedFiles() files: any[]) {
    return this.aiProcessingService.transcribeVoice(
      user.id,
      this.pickFile(files, 'Voice'),
    );
  }

  @Post('transactions')
  @UseInterceptors(AnyFilesInterceptor())
  createTransaction(
    @CurrentUser() user: JwtUser,
    @UploadedFiles() files: any[],
    @Body() dto: VoiceTransactionUploadDto,
  ) {
    return this.aiProcessingService.createTransactionFromVoice(
      user.id,
      dto.WalletId,
      this.pickFile(files, 'Voice'),
      dto.MockTranscribedText,
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
