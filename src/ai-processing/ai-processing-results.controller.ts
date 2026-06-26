import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AiProcessingService } from './ai-processing.service';
import { CreateAiProcessingResultDto } from './dto/create-ai-processing-result.dto';

@Public()
@Controller('ai-processing/results')
export class AiProcessingResultsController {
  constructor(private readonly aiProcessingService: AiProcessingService) {}

  @Get(':requestId')
  findByRequest(@Param('requestId') requestId: string) {
    return this.aiProcessingService.findResultByRequest(requestId);
  }

  @Post()
  create(@Body() dto: CreateAiProcessingResultDto) {
    return this.aiProcessingService.createResult(dto);
  }
}
