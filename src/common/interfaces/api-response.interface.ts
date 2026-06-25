export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  path?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}
