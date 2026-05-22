/**
 * Sort descriptor — same shape as the `QueryRequest.sort[]` wire-format
 * field. Used by the M20 toolbar sort-by section and emitted via the
 * `[(sortBy)]` model on the Angular wrapper.
 */
export interface SortDescriptor {
  field: string;
  direction: 'asc' | 'desc';
}
