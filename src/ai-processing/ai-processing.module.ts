import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from '../tags/entities/tag.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { AiProcessingRequestsController } from './ai-processing-requests.controller';
import { AiProcessingResultsController } from './ai-processing-results.controller';
import { AiProcessingService } from './ai-processing.service';
import { AiProcessingRequest } from './entities/ai-processing-request.entity';
import { AiProcessingResult } from './entities/ai-processing-result.entity';
import { ImageAiController } from './image-ai.controller';
import { VoiceAiController } from './voice-ai.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiProcessingRequest, AiProcessingResult, Tag]),
    TransactionsModule,
  ],
  controllers: [
    AiProcessingRequestsController,
    AiProcessingResultsController,
    ImageAiController,
    VoiceAiController,
  ],
  providers: [AiProcessingService],
})
export class AiProcessingModule {}
