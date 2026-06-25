export enum ErrorCode {
  ValidationError = 'VALIDATION_ERROR',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  BadRequest = 'BAD_REQUEST',
  InternalError = 'INTERNAL_ERROR',
  InvalidCredentials = 'INVALID_CREDENTIALS',
  RefreshTokenInvalid = 'REFRESH_TOKEN_INVALID',
  OwnershipViolation = 'OWNERSHIP_VIOLATION',
  SyncConflict = 'SYNC_CONFLICT',
}
