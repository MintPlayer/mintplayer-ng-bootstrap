import type { OperationFlags } from '../components/mp-file-manager';
export type FileSystemNodeType = 'folder' | 'file';

export interface FileSystemNode {
  id: string;
  parentId: string | null;
  name: string;
  type: FileSystemNodeType;
  size?: number;
  modifiedAt?: string;
  mimeType?: string;
  iconKey?: string;
  /**
   * Per-node operation overrides. Each unset key falls back to the global
   * `allowOperations` on `<mp-file-manager>`. Example: `{ delete: false }`
   * marks this node read-only for delete while still inheriting the global
   * rename/copy permissions.
   */
  allowOperations?: Partial<OperationFlags>;
  /**
   * Free-form metadata. The file-manager itself reads only `meta.loading`
   * (set by the WC during lazy-tree expansion); everything else is yours.
   */
  meta?: Record<string, unknown>;
}
