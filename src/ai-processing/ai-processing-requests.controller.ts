import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AiProcessingService } from './ai-processing.service';
import { AiProcessingRequestQueryDto } from './dto/ai-processing-query.dto';
import { CreateAiProcessingRequestDto } from './dto/create-ai-processing-request.dto';

@Public()
@Controller('ai-processing/requests')
export class AiProcessingRequestsController {
  constructor(private readonly aiProcessingService: AiProcessingService) {}

  @Get()
  findAll(@Query() query: AiProcessingRequestQueryDto) {
    return this.aiProcessingService.findRequests(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiProcessingService.findRequest(id);
  }

  @Post()
  create(@Body() dto: CreateAiProcessingRequestDto) {
    return this.aiProcessingService.createRequest(dto);
  }
}
