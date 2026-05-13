import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';

export type BsDatatableFetch<T> =
  (req: PaginationRequest) => Promise<PaginationResponse<T>>;
