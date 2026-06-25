import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '../errors/error-code.enum';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

interface NormalizedError {
  status: HttpStatus;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();
    const normalized = this.normalize(exception);

    response.status(normalized.status).json({
      success: false,
      data: null,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      meta: {
        requestId: request.requestId ?? 'unknown',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (!(exception instanceof HttpException)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.InternalError,
        message: 'Internal server error',
      };
    }

    const status = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'object' && response !== null) {
      const body = response as {
        code?: ErrorCode;
        message?: string | string[];
        details?: unknown;
      };

      if (body.code) {
        return {
          status,
          code: body.code,
          message: Array.isArray(body.message)
            ? body.message[0]
            : (body.message ?? exception.message),
          details: body.details,
        };
      }

      if (status === 400 && Array.isArray(body.message)) {
        return {
          status,
          code: ErrorCode.ValidationError,
          message: 'Invalid request body',
          details: body.message,
        };
      }
    }

    return {
      status,
      code: this.codeFromStatus(status),
      message: exception.message,
    };
  }

  private codeFromStatus(status: HttpStatus): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.Unauthorized;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.Forbidden;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NotFound;
      case HttpStatus.CONFLICT:
        return ErrorCode.Conflict;
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BadRequest;
      default:
        return ErrorCode.InternalError;
    }
  }
}
