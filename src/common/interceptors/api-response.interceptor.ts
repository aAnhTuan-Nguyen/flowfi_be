import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  PaginatedResult,
} from '../interfaces/api-response.interface';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PaginatedResult<T>).items) &&
    typeof (value as PaginatedResult<T>).pagination === 'object'
  );
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T | T[]>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T | T[]>> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return next.handle().pipe(
      map((body: T | PaginatedResult<T>) => {
        const timestamp = new Date().toISOString();
        const requestId = request.requestId ?? 'unknown';

        if (isPaginatedResult<T>(body)) {
          return {
            success: true,
            data: body.items,
            error: null,
            meta: {
              requestId,
              timestamp,
              pagination: body.pagination,
            },
          };
        }

        return {
          success: true,
          data: body ?? null,
          error: null,
          meta: {
            requestId,
            timestamp,
          },
        };
      }),
    );
  }
}
