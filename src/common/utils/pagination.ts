import {
  PaginatedResult,
  PaginationMeta,
} from '../interfaces/api-response.interface';

export function buildPagination(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
  };
}

export function paginated<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return {
    items,
    pagination: buildPagination(page, limit, total),
  };
}
