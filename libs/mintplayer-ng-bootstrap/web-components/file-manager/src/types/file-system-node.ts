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
  meta?: Record<string, unknown>;
}
