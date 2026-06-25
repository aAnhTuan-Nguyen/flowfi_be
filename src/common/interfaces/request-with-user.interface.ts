import { Request } from 'express';

export interface JwtUser {
  id: string;
  email: string;
}

export interface RequestWithUser extends Request {
  requestId?: string;
  user?: JwtUser;
}
