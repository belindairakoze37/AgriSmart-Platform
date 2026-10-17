import type { Paginated } from './types';

export function getNextPage<T>(
  page: Paginated<T>,
  _pages: Paginated<T>[],
  currentPage: number,
): number | undefined {
  return page.next ? currentPage + 1 : undefined;
}
