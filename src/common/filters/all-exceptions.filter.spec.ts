/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCode } from '../errors/error-code.enum';

describe('AllExceptionsFilter', () => {
  it('normalizes validation errors into a code-first envelope', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const filter = new AllExceptionsFilter();
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          requestId: 'req_validation',
          url: '/api/v1/wallets',
        }),
        getResponse: () => ({ status, json }),
      }),
    } as any;

    filter.catch(
      new BadRequestException({
        message: ['name must be longer than or equal to 1 characters'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: ErrorCode.ValidationError,
        message: 'Invalid request body',
        details: ['name must be longer than or equal to 1 characters'],
      },
      meta: {
        requestId: 'req_validation',
        timestamp: expect.any(String),
        path: '/api/v1/wallets',
      },
    });
  });
});
