import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ErrorCode } from '../common/errors/error-code.enum';
import { Tag } from '../tags/entities/tag.entity';
import { TagType } from '../tags/tag.enums';
import {
  TransactionInputMethod,
  TransactionType,
} from '../transactions/transaction.enums';
import { TransactionsService } from '../transactions/transactions.service';
import {
  AiImageType,
  AiInputType,
  AiRequestStatus,
  AiRequestType,
  AiTag,
  AiTransactionType,
} from './ai-processing.enums';
import { CreateAiProcessingRequestDto } from './dto/create-ai-processing-request.dto';
import { CreateAiProcessingResultDto } from './dto/create-ai-processing-result.dto';
import { AiProcessingRequestQueryDto } from './dto/ai-processing-query.dto';
import { AiProcessingRequest } from './entities/ai-processing-request.entity';
import { AiProcessingResult } from './entities/ai-processing-result.entity';

type UploadedAiFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
};

type ParsedTransaction = {
  title: string;
  amount: number;
  transactionType: AiTransactionType;
  tagName: string;
  tag: AiTag;
  note: string;
  transactionDate: string | null;
  merchantName: string | null;
  rawText: string;
  confidence: number;
};

type CreatedAiTransaction = {
  tag: Tag;
  tagCreated: boolean;
  transaction: Awaited<ReturnType<TransactionsService['create']>>;
};

@Injectable()
export class AiProcessingService {
  private readonly imageContentTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
  private readonly imageExtensions = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
  ]);
  private readonly audioContentTypes = new Set([
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/webm',
    'audio/ogg',
  ]);
  private readonly audioExtensions = new Set([
    '.mp3',
    '.wav',
    '.m4a',
    '.mp4',
    '.ogg',
    '.webm',
  ]);

  constructor(
    @InjectRepository(AiProcessingRequest)
    private readonly requestsRepository: Repository<AiProcessingRequest>,
    @InjectRepository(AiProcessingResult)
    private readonly resultsRepository: Repository<AiProcessingResult>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    private readonly transactionsService: TransactionsService,
  ) {}

  findRequests(query: AiProcessingRequestQueryDto) {
    return this.requestsRepository.find({
      where: query.userId ? { userId: query.userId } : {},
      relations: { result: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findRequest(id: string): Promise<AiProcessingRequest> {
    const request = await this.requestsRepository.findOne({
      where: { id },
      relations: { result: true },
    });
    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'AI processing request not found',
      });
    }
    return request;
  }

  createRequest(dto: CreateAiProcessingRequestDto) {
    return this.requestsRepository.save(
      this.requestsRepository.create({
        userId: dto.userId ?? null,
        inputType: dto.inputType,
        requestType: dto.requestType,
        inputUrl: dto.inputUrl ?? null,
        status: dto.status ?? AiRequestStatus.Pending,
      }),
    );
  }

  async findResultByRequest(requestId: string): Promise<AiProcessingResult> {
    const result = await this.resultsRepository.findOne({
      where: { requestId },
    });
    if (!result) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'AI processing result not found',
      });
    }
    return result;
  }

  async createResult(dto: CreateAiProcessingResultDto) {
    await this.findRequest(dto.requestId);
    return this.resultsRepository.save(
      this.resultsRepository.create({
        requestId: dto.requestId,
        amount: dto.amount ?? null,
        transactionType: dto.transactionType ?? null,
        tag: dto.tag ?? null,
        transactionDate: dto.transactionDate
          ? new Date(dto.transactionDate)
          : null,
        rawResponse: dto.rawResponse ?? null,
      }),
    );
  }

  async extractTextFromImage(userId: string, file: UploadedAiFile | undefined) {
    this.validateFile(file, {
      label: 'Image',
      maxBytes: 5 * 1024 * 1024,
      contentTypes: this.imageContentTypes,
      extensions: this.imageExtensions,
    });

    const imageUrl = this.buildStoredFileUrl('images', file!);
    const request = await this.createManagedRequest({
      userId,
      inputType: AiInputType.Image,
      requestType: AiRequestType.Ocr,
      inputUrl: imageUrl,
    });
    let analysis: ReturnType<typeof this.analyzeImage>;
    let result: AiProcessingResult;
    try {
      analysis = await this.analyzeImageWithProvider(file!);
      result = await this.saveAnalysisResult(request.id, analysis);
      await this.completeRequest(request);
    } catch (error) {
      await this.failRequest(request, error);
      throw error;
    }

    return {
      requestId: request.id,
      resultId: result.id,
      status: AiRequestStatus.Completed,
      imageUrl,
      analysis,
    };
  }

  async createTransactionsFromImage(
    userId: string,
    walletId: string,
    file: UploadedAiFile | undefined,
  ) {
    this.assertUuid(walletId, 'WalletId');
    const extracted = await this.extractTextFromImage(userId, file);
    const createdTransactions = await this.createTransactionsFromAnalysis(
      userId,
      walletId,
      extracted.analysis.transactions,
      TransactionInputMethod.OCR,
    );

    return {
      aiRequestId: extracted.requestId,
      aiResultId: extracted.resultId,
      imageUrl: extracted.imageUrl,
      analysis: extracted.analysis,
      createdTransactions,
    };
  }

  async transcribeVoice(userId: string, file: UploadedAiFile | undefined) {
    this.validateAudio(file);
    const voiceUrl = this.buildStoredFileUrl('voices', file!);
    const request = await this.createManagedRequest({
      userId,
      inputType: AiInputType.Audio,
      requestType: AiRequestType.VoiceToText,
      inputUrl: voiceUrl,
    });
    const transcriptText = this.mockTranscript(file!.originalname);
    await this.saveAnalysisResult(request.id, {
      inputType: AiInputType.Voice,
      transactions: [],
      warnings: [],
      rawResponse: transcriptText,
    });
    await this.completeRequest(request);
    return { transcriptText };
  }

  async createTransactionFromVoice(
    userId: string,
    walletId: string,
    file: UploadedAiFile | undefined,
    mockTranscribedText?: string,
  ) {
    this.assertUuid(walletId, 'WalletId');
    this.validateAudio(file);

    const voiceUrl = this.buildStoredFileUrl('voices', file!);
    const request = await this.createManagedRequest({
      userId,
      inputType: AiInputType.Audio,
      requestType: AiRequestType.VoiceToTransaction,
      inputUrl: voiceUrl,
    });
    const rawText =
      mockTranscribedText ?? this.mockTranscript(file!.originalname);
    const analysis = this.analyzeVoiceText(rawText);
    const result = await this.saveAnalysisResult(request.id, analysis);
    await this.completeRequest(request);

    const [created] = await this.createTransactionsFromAnalysis(
      userId,
      walletId,
      analysis.transactions.slice(0, 1),
      TransactionInputMethod.Voice,
    );

    return {
      aiRequestId: request.id,
      aiResultId: result.id,
      voiceUrl,
      rawText,
      parsedData: analysis.transactions[0] ?? null,
      analysis,
      tag: created?.tag ?? null,
      tagCreated: created?.tagCreated ?? false,
      transaction: created?.transaction ?? null,
    };
  }

  private async createManagedRequest(input: {
    userId: string;
    inputType: AiInputType;
    requestType: AiRequestType;
    inputUrl: string;
  }) {
    return this.requestsRepository.save(
      this.requestsRepository.create({
        ...input,
        status: AiRequestStatus.Processing,
      }),
    );
  }

  private async completeRequest(request: AiProcessingRequest) {
    request.status = AiRequestStatus.Completed;
    await this.requestsRepository.save(request);
  }

  private async failRequest(request: AiProcessingRequest, error: unknown) {
    request.status = AiRequestStatus.Failed;
    request.errorMessage =
      error instanceof Error ? error.message : 'AI processing failed';
    await this.requestsRepository.save(request);
  }

  private async saveAnalysisResult(
    requestId: string,
    analysis: Record<string, unknown> & { transactions: ParsedTransaction[] },
  ) {
    const primary = analysis.transactions[0];
    return this.resultsRepository.save(
      this.resultsRepository.create({
        requestId,
        amount: primary ? primary.amount.toFixed(2) : null,
        transactionType: primary?.transactionType ?? null,
        tag: primary?.tag ?? null,
        transactionDate: primary?.transactionDate
          ? new Date(primary.transactionDate)
          : null,
        confidence: primary ? primary.confidence.toFixed(4) : null,
        rawResponse: JSON.stringify(analysis),
        parsedData: analysis,
      }),
    );
  }

  private async createTransactionsFromAnalysis(
    userId: string,
    walletId: string,
    transactions: ParsedTransaction[],
    inputMethod: TransactionInputMethod,
  ) {
    if (transactions.length === 0) {
      throw new UnprocessableEntityException({
        code: 'AI_NO_FINANCIAL_TRANSACTION_FOUND',
        message: 'No financial transaction found',
      });
    }

    const created: CreatedAiTransaction[] = [];
    for (const item of transactions) {
      if (
        item.amount <= 0 ||
        item.transactionType === AiTransactionType.Unknown
      ) {
        continue;
      }
      const { tag, tagCreated } = await this.findOrCreateTag(
        userId,
        item.tagName,
        item.transactionType,
      );
      const transaction = await this.transactionsService.create(userId, {
        walletId,
        tagId: tag.id,
        title: item.title,
        description: item.note || item.rawText,
        amount: item.amount.toFixed(2),
        transactionType:
          item.transactionType === AiTransactionType.Income
            ? TransactionType.Income
            : TransactionType.Expense,
        transactionDate: item.transactionDate ?? new Date().toISOString(),
        inputMethod,
        merchantName: item.merchantName ?? undefined,
      });
      created.push({ tag, tagCreated, transaction });
    }

    if (created.length === 0) {
      throw new UnprocessableEntityException({
        code: 'AI_NO_FINANCIAL_TRANSACTION_FOUND',
        message: 'No valid transaction could be created',
      });
    }
    return created;
  }

  private async findOrCreateTag(
    userId: string,
    tagName: string,
    transactionType: AiTransactionType,
  ) {
    const type =
      transactionType === AiTransactionType.Income
        ? TagType.Income
        : TagType.Expense;
    const existing = await this.tagsRepository.findOne({
      where: [
        { userId, name: tagName, type },
        { userId: IsNull(), name: tagName, type, isDefault: true },
      ],
    });
    if (existing) return { tag: existing, tagCreated: false };

    const tag = await this.tagsRepository.save(
      this.tagsRepository.create({
        userId,
        name: tagName,
        type,
        isDefault: false,
      }),
    );
    return { tag, tagCreated: true };
  }

  private validateAudio(file: UploadedAiFile | undefined) {
    this.validateFile(file, {
      label: 'Voice',
      maxBytes: 20 * 1024 * 1024,
      contentTypes: this.audioContentTypes,
      extensions: this.audioExtensions,
    });
  }

  private validateFile(
    file: UploadedAiFile | undefined,
    options: {
      label: string;
      maxBytes: number;
      contentTypes: Set<string>;
      extensions: Set<string>;
    },
  ) {
    if (!file || file.size <= 0) {
      throw new BadRequestException(`${options.label} file is required`);
    }
    if (file.size > options.maxBytes) {
      throw new BadRequestException(`${options.label} file is too large`);
    }
    if (!options.contentTypes.has(file.mimetype)) {
      throw new BadRequestException(
        `${options.label} content type is not allowed`,
      );
    }
    const extension = this.fileExtension(file.originalname);
    if (!options.extensions.has(extension)) {
      throw new BadRequestException(
        `${options.label} extension is not allowed`,
      );
    }
  }

  private assertUuid(value: string, label: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`${label} must be a valid UUID`);
    }
  }

  private buildStoredFileUrl(
    folder: 'images' | 'voices',
    file: UploadedAiFile,
  ) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `ai-processing/${folder}/${Date.now()}-${safeName}`;
    const baseUrl = process.env.SUPABASE_STORAGE_PUBLIC_URL;
    if (baseUrl) return `${baseUrl.replace(/\/$/, '')}/${key}`;
    return `local://${key}`;
  }

  private analyzeImage(rawText: string) {
    const transactions = this.parseTransactions(rawText, false);
    return {
      imageType: this.guessImageType(rawText),
      confidence: transactions.length > 0 ? 0.85 : 0.2,
      transactions,
      warnings:
        transactions.length > 0 ? [] : ['No financial transaction found'],
      rawResponse: JSON.stringify({ rawText }),
    };
  }

  private async analyzeImageWithProvider(file: UploadedAiFile) {
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Image buffer is missing');
    }

    const apiKey = this.envValue(
      'AI_PROVIDER_API_KEY',
      'FLOWFI_AI__AiProvider__ApiKey',
    );
    if (!apiKey) {
      throw new BadRequestException('AI provider API key is not configured');
    }

    const baseUrl =
      this.envValue('AI_PROVIDER_BASE_URL', 'FLOWFI_AI__AiProvider__BaseUrl') ??
      'https://getnexai.net/api/v1';
    const responsesPath =
      this.envValue(
        'AI_PROVIDER_RESPONSES_PATH',
        'FLOWFI_AI__AiProvider__ResponsesPath',
      ) ?? '/responses';
    const model =
      this.envValue('AI_PROVIDER_MODEL', 'FLOWFI_AI__AiProvider__Model') ??
      'gpt-5.5';
    const timeoutSeconds = Number(
      this.envValue(
        'AI_PROVIDER_TIMEOUT_SECONDS',
        'FLOWFI_AI__AiProvider__TimeoutSeconds',
      ) ?? 30,
    );
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Math.max(timeoutSeconds, 1) * 1000,
    );

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}${responsesPath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: this.imageTransactionPrompt(),
                  },
                  {
                    type: 'input_image',
                    image_url: `data:${file.mimetype};base64,${file.buffer.toString(
                      'base64',
                    )}`,
                  },
                ],
              },
            ],
            reasoning: {
              effort:
                this.envValue(
                  'AI_PROVIDER_REASONING_EFFORT',
                  'FLOWFI_AI__AiProvider__ReasoningEffort',
                ) ?? 'low',
            },
            text: {
              verbosity:
                this.envValue(
                  'AI_PROVIDER_VERBOSITY',
                  'FLOWFI_AI__AiProvider__Verbosity',
                ) ?? 'low',
            },
          }),
          signal: controller.signal,
        },
      );

      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new UnprocessableEntityException({
          code: 'AI_PROVIDER_REQUEST_FAILED',
          message: `AI provider returned ${response.status}`,
          detail: payload,
        });
      }

      const rawText = this.extractProviderText(payload);
      const parsed = this.parseJsonObject(rawText);
      return this.normalizeImageAnalysis(parsed, rawText);
    } finally {
      clearTimeout(timeout);
    }
  }

  private analyzeVoiceText(rawText: string) {
    return {
      inputType: AiInputType.Voice,
      transactions: this.parseTransactions(rawText, true),
      warnings: this.parseTransactions(rawText, true).length
        ? []
        : ['No financial transaction found'],
      rawResponse: JSON.stringify({ rawText }),
    };
  }

  private parseTransactions(
    rawText: string,
    aggregate: boolean,
  ): ParsedTransaction[] {
    const amounts = this.extractAmounts(rawText);
    if (amounts.length === 0) return [];

    const tag = this.guessTag(rawText);
    const transactionType = this.guessTransactionType(rawText);
    const merchantName = this.guessMerchant(rawText);
    const amount = aggregate
      ? amounts.reduce((sum, item) => sum + item, 0)
      : Math.max(...amounts);
    return [
      {
        title: aggregate
          ? 'Voice expense'
          : merchantName
            ? `Purchase at ${merchantName}`
            : 'AI parsed transaction',
        amount,
        transactionType,
        tagName: this.tagName(tag),
        tag,
        note: rawText,
        transactionDate: null,
        merchantName,
        rawText,
        confidence: 0.9,
      },
    ];
  }

  private normalizeImageAnalysis(
    value: Record<string, unknown>,
    rawResponse: string,
  ) {
    const rawTransactions = Array.isArray(value.transactions)
      ? value.transactions
      : [];
    const transactions = rawTransactions
      .map((item) =>
        typeof item === 'object' && item !== null
          ? this.normalizeTransaction(item as Record<string, unknown>)
          : null,
      )
      .filter((item): item is ParsedTransaction => item !== null);

    return {
      imageType: this.toImageType(value.imageType),
      confidence: this.toConfidence(value.confidence),
      transactions,
      warnings: Array.isArray(value.warnings)
        ? value.warnings.map(String)
        : transactions.length
          ? []
          : ['No financial transaction found'],
      rawResponse,
    };
  }

  private normalizeTransaction(
    value: Record<string, unknown>,
  ): ParsedTransaction | null {
    const amount = Number(value.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const transactionType = this.toAiTransactionType(
      value.transactionType ?? value.type,
    );
    if (
      transactionType === AiTransactionType.Transfer ||
      transactionType === AiTransactionType.Unknown
    ) {
      return null;
    }

    const rawTagName = this.asString(value.tagName, 'Other');
    const tag = this.guessTag(rawTagName);
    return {
      title: this.asString(value.title, 'AI parsed transaction'),
      amount,
      transactionType,
      tagName: rawTagName,
      tag,
      note: this.asString(value.note, ''),
      transactionDate: this.asStringOrNull(value.transactionDate),
      merchantName: this.asStringOrNull(value.merchantName),
      rawText: this.asString(value.rawText, ''),
      confidence: this.toConfidence(value.confidence),
    };
  }

  private extractProviderText(payload: unknown): string {
    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      if (typeof record.output_text === 'string') return record.output_text;
      if (typeof record.text === 'string') return record.text;
      const output = record.output;
      if (Array.isArray(output)) {
        for (const item of output) {
          if (typeof item !== 'object' || item === null) continue;
          const content = (item as Record<string, unknown>).content;
          if (!Array.isArray(content)) continue;
          for (const part of content) {
            if (typeof part !== 'object' || part === null) continue;
            const partRecord = part as Record<string, unknown>;
            if (typeof partRecord.text === 'string') return partRecord.text;
            if (typeof partRecord.output_text === 'string') {
              return partRecord.output_text;
            }
          }
        }
      }
    }
    return JSON.stringify(payload);
  }

  private parseJsonObject(rawText: string): Record<string, unknown> {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(rawText);
    const candidate = fenced?.[1] ?? rawText;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new UnprocessableEntityException({
        code: 'AI_INVALID_STRUCTURED_RESPONSE',
        message: 'AI response does not contain a JSON object',
      });
    }
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
    } catch {
      throw new UnprocessableEntityException({
        code: 'AI_INVALID_STRUCTURED_RESPONSE',
        message: 'AI response is not valid JSON',
      });
    }
  }

  private imageTransactionPrompt() {
    return `
You are the AI engine that converts Vietnamese finance images into FlowFi transactions.

The image may be a receipt, bank transfer screenshot, handwritten note, or unrelated image.
Read the image and return only valid JSON. Do not explain.

Rules:
- Receipt/bill: create exactly 1 transaction from the final total, not each item.
- Bank transfer: create exactly 1 transaction.
- Note with multiple clear expenses: may create multiple transactions.
- Never invent an amount. If no amount is readable, transactions must be [].
- Use type EXPENSE, INCOME, TRANSFER, or UNKNOWN.
- Use imageType RECEIPT, BANK_TRANSFER, NOTE, or UNKNOWN.
- Use tagName in Vietnamese user-friendly categories: An uong, Di chuyen, Mua sam, Hoc tap, Hoa don, Thu nhap, Khac.

Return this JSON shape:
{
  "imageType": "RECEIPT | BANK_TRANSFER | NOTE | UNKNOWN",
  "confidence": 0.0,
  "transactions": [
    {
      "title": "",
      "amount": 0,
      "type": "EXPENSE | INCOME | TRANSFER | UNKNOWN",
      "tagName": "",
      "tagType": "EXPENSE | INCOME",
      "note": "",
      "transactionDate": null,
      "merchantName": null,
      "rawText": "",
      "confidence": 0.0
    }
  ],
  "warnings": []
}`.trim();
  }

  private toImageType(value: unknown): AiImageType {
    if (Object.values(AiImageType).includes(value as AiImageType)) {
      return value as AiImageType;
    }
    return AiImageType.Unknown;
  }

  private toAiTransactionType(value: unknown): AiTransactionType {
    if (Object.values(AiTransactionType).includes(value as AiTransactionType)) {
      return value as AiTransactionType;
    }
    return AiTransactionType.Unknown;
  }

  private toConfidence(value: unknown): number {
    const confidence = Number(value);
    if (!Number.isFinite(confidence)) return 0;
    return Math.max(0, Math.min(1, confidence));
  }

  private asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private asStringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private envValue(...keys: string[]): string | undefined {
    for (const key of keys) {
      const value = process.env[key]?.trim();
      if (value) return value;
    }
    return undefined;
  }

  private extractAmounts(text: string): number[] {
    const amounts: number[] = [];
    const normalized = text.toLowerCase().replace(/,/g, '.');
    const amountPattern =
      /(\d+(?:\.\d+)?)\s*(k|nghin|ngan|trieu|m|vnd|dong|d)?/gi;
    let match: RegExpExecArray | null;
    while ((match = amountPattern.exec(normalized)) !== null) {
      const numeric = Number(match[1]);
      if (!Number.isFinite(numeric) || numeric <= 0) continue;
      const unit = match[2] ?? '';
      if (['k', 'nghin', 'ngan'].includes(unit)) {
        amounts.push(numeric * 1000);
      } else if (['trieu', 'm'].includes(unit)) {
        amounts.push(numeric * 1000000);
      } else if (numeric >= 1000) {
        amounts.push(numeric);
      }
    }
    return amounts;
  }

  private guessImageType(text: string): AiImageType {
    const normalized = text.toLowerCase();
    if (/(chuyen khoan|bank|transfer|stk|tai khoan)/.test(normalized)) {
      return AiImageType.BankTransfer;
    }
    if (/(hoa don|bill|receipt|total|tong)/.test(normalized)) {
      return AiImageType.Receipt;
    }
    if (/(note|ghi chu|an sang|tra sua|xang)/.test(normalized)) {
      return AiImageType.Note;
    }
    return AiImageType.Unknown;
  }

  private guessTransactionType(text: string): AiTransactionType {
    const normalized = text.toLowerCase();
    if (/(nhan|luong|hoan tien|income)/.test(normalized)) {
      return AiTransactionType.Income;
    }
    if (/(chuyen giua|transfer between)/.test(normalized)) {
      return AiTransactionType.Transfer;
    }
    return AiTransactionType.Expense;
  }

  private guessTag(text: string): AiTag {
    const normalized = text.toLowerCase();
    if (/(an|com|bun|pho|coffee|cafe|tra sua|food)/.test(normalized)) {
      return AiTag.Food;
    }
    if (/(xang|grab|taxi|xe|transport)/.test(normalized)) {
      return AiTag.Transport;
    }
    if (/(sieu thi|tap hoa|bach hoa|shopping|mua)/.test(normalized)) {
      return AiTag.Shopping;
    }
    if (/(hoc|sach|education)/.test(normalized)) {
      return AiTag.Education;
    }
    if (/(dien|nuoc|internet|bill)/.test(normalized)) {
      return AiTag.Bills;
    }
    if (/(luong|nhan|income)/.test(normalized)) {
      return AiTag.Income;
    }
    return AiTag.Other;
  }

  private tagName(tag: AiTag): string {
    const names: Record<AiTag, string> = {
      [AiTag.Food]: 'Food',
      [AiTag.Transport]: 'Transport',
      [AiTag.Shopping]: 'Shopping',
      [AiTag.Education]: 'Education',
      [AiTag.Bills]: 'Bills',
      [AiTag.Income]: 'Income',
      [AiTag.Other]: 'Other',
    };
    return names[tag];
  }

  private guessMerchant(text: string): string | null {
    const match = /(bach hoa xanh|coopmart|highlands|circle k|winmart)/i.exec(
      text,
    );
    return match ? match[1] : null;
  }

  private mockTranscript(fileName: string) {
    return `Mock transcription for ${fileName}`;
  }

  private fileExtension(fileName: string) {
    const dot = fileName.lastIndexOf('.');
    return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
  }
}
