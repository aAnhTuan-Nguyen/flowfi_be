/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { AiProcessingService } from './ai-processing.service';
import {
  AiInputType,
  AiImageType,
  AiTransactionType,
} from './ai-processing.enums';
import {
  TransactionInputMethod,
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';

describe('AiProcessingService draft transactions', () => {
  const walletId = '11111111-1111-4111-8111-111111111111';

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.AI_PROVIDER_API_KEY;
  });

  it('creates image transactions as Draft OCR transactions', async () => {
    const tagsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'tag_food' }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const transactionsService = {
      create: jest.fn().mockResolvedValue({
        id: 'tx_1',
        walletId,
        status: TransactionStatus.Draft,
        inputMethod: TransactionInputMethod.OCR,
      }),
    };
    const service = new AiProcessingService(
      {} as never,
      {} as never,
      tagsRepository as never,
      transactionsService as never,
    );
    jest.spyOn(service, 'extractTextFromImage').mockResolvedValue({
      requestId: 'ai_request_1',
      resultId: 'ai_result_1',
      status: 'COMPLETED',
      imageUrl: 'local://receipt.png',
      analysis: {
        inputType: AiInputType.Image,
        imageType: AiImageType.Receipt,
        confidence: 0.9,
        transactions: [
          {
            title: 'Coffee',
            amount: 50000,
            transactionType: AiTransactionType.Expense,
            tagName: 'Food',
            tag: 'FOOD',
            note: 'Coffee receipt',
            transactionDate: null,
            merchantName: 'Cafe',
            rawText: 'Cafe 50000',
            confidence: 0.9,
          },
        ],
        warnings: [],
        rawResponse: '{}',
      },
    } as never);

    const result = await service.createTransactionsFromImage(
      'user_1',
      walletId,
      undefined,
    );

    expect(transactionsService.create).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        walletId,
        inputMethod: TransactionInputMethod.OCR,
        status: TransactionStatus.Draft,
        transactionType: TransactionType.Expense,
      }),
    );
    expect(result.createdTransactions[0].transaction).toEqual(
      expect.objectContaining({
        id: 'tx_1',
        status: TransactionStatus.Draft,
        inputMethod: TransactionInputMethod.OCR,
      }),
    );
  });

  it('transcribes real audio and creates a Draft voice transaction', async () => {
    process.env.AI_PROVIDER_API_KEY = 'test-key';
    const requestsRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'request_1', ...value })),
    };
    const resultsRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'result_1', ...value })),
    };
    const tagsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'tag_food' }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const transactionsService = {
      create: jest.fn().mockResolvedValue({
        id: 'tx_voice',
        status: TransactionStatus.Draft,
      }),
    };
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: 'Ăn trưa năm mươi nghìn' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              transactions: [
                {
                  title: 'Ăn trưa',
                  amount: 50000,
                  type: 'EXPENSE',
                  tagName: 'Food',
                  note: '',
                  transactionDate: null,
                  merchantName: null,
                  rawText: 'Ăn trưa năm mươi nghìn',
                  confidence: 0.95,
                },
              ],
              warnings: [],
            }),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    const service = new AiProcessingService(
      requestsRepository as never,
      resultsRepository as never,
      tagsRepository as never,
      transactionsService as never,
    );

    const result = await service.createTransactionFromVoice(
      'user_1',
      walletId,
      {
        originalname: 'voice.m4a',
        mimetype: 'audio/x-m4a',
        size: 4,
        buffer: Buffer.from('voice'),
      },
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(transactionsService.create).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        amount: '50000.00',
        inputMethod: TransactionInputMethod.Voice,
        status: TransactionStatus.Draft,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        rawText: 'Ăn trưa năm mươi nghìn',
        requiresConfirmation: true,
      }),
    );
  });
});
