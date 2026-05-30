import type { TreeNode } from '@mintplayer/web-components/treeview';
import type { NodePage, NodeRequest, TreeSelectProvider } from '../types';

export interface InMemoryProviderOptions {
  /** Rows per page for roots / children / search. Default: 50. */
  pageSize?: number;
  /** Artificial latency in ms — exercises loading/race states. Default: 0. */
  delayMs?: number;
}

/**
 * A {@link TreeSelectProvider} backed by an in-memory tree. Backs unit tests,
 * demos, and e2e without a network. Returned nodes are **shallow** — children
 * are stripped and `lazy` is set when the source node has children — so the
 * component lazy-loads each level through `loadChildren`, mirroring a real
 * paged backend.
 */
export class InMemoryTreeSelectProvider implements TreeSelectProvider {
  private readonly byId = new Map<string, TreeNode>();
  private readonly flat: TreeNode[] = [];
  private readonly pageSize: number;
  private readonly delayMs: number;

  constructor(private readonly tree: TreeNode[], options: InMemoryProviderOptions = {}) {
    this.pageSize = options.pageSize ?? 50;
    this.delayMs = options.delayMs ?? 0;
    const walk = (nodes: ReadonlyArray<TreeNode>) => {
      for (const node of nodes) {
        this.byId.set(node.id, node);
        this.flat.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(tree);
  }

  loadRoots(req: NodeRequest): Promise<NodePage> {
    return this.page(this.tree, req);
  }

  loadChildren(parentId: string, req: NodeRequest): Promise<NodePage> {
    const parent = this.byId.get(parentId);
    return this.page(parent?.children ?? [], req);
  }

  search(query: string, req: NodeRequest): Promise<NodePage> {
    const q = query.trim().toLowerCase();
    if (!q) return this.page([], req);
    const matches = this.flat.filter(
      (n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
    );
    return this.page(matches, req);
  }

  private async page(source: ReadonlyArray<TreeNode>, req: NodeRequest): Promise<NodePage> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    if (req.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const offset = Math.max(0, req.offset ?? 0);
    const slice = source.slice(offset, offset + this.pageSize);
    return {
      nodes: slice.map((n) => this.toShallow(n)),
      hasMore: offset + this.pageSize < source.length,
    };
  }

  /** Strip children; flag `lazy` when the source node actually has children. */
  private toShallow(node: TreeNode): TreeNode {
    const hasChildren = !!node.children?.length;
    return { ...node, children: undefined, lazy: hasChildren };
  }
}
