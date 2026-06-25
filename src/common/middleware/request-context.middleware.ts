import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestWithUser, res: Response, next: NextFunction): void {
    const headerValue = req.header('x-request-id');
    req.requestId =
      headerValue && headerValue.trim() ? headerValue : `req_${randomUUID()}`;
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
