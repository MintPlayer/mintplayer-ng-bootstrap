import { DestroyRef, Directive, inject, Injector, input, TemplateRef } from '@angular/core';
import type { MintTile } from '@mintplayer/ui-core/tile-manager';

/** The context of a `*bsTile` template: the tile it renders. */
export interface BsTileContext<T extends MintTile = MintTile> {
  $implicit: T;
}

/**
 * One tile's slots. The manager stamps the `*bsTile` template once per tile with an injector
 * providing that tile's `BsTileSlots`; `*bsTileHeader` / `*bsTileContent` inside it register
 * their template here, and the manager renders them into the tile's header and body. Kept per
 * tile id, so a new tile object (a locked panel, say) updates the view instead of rebuilding it.
 */
export class BsTileSlots {
  header: TemplateRef<unknown> | null = null;
  content: TemplateRef<unknown> | null = null;
  readonly injector: Injector;

  constructor(parent: Injector) {
    this.injector = Injector.create({ providers: [{ provide: BsTileSlots, useValue: this }], parent });
  }
}

/**
 * Declares the markup of every tile, once, inside `<bs-tile-manager>`. The header and body are
 * its direct `*bsTileHeader` / `*bsTileContent` children, and both see the tile variable.
 *
 * ```html
 * <bs-tile-manager [(layouts)]="layouts">
 *   <ng-container *bsTile="let tile of tiles()">
 *     <span *bsTileHeader>{{ tile.title }}</span>
 *     <div *bsTileContent>{{ tile.body }}</div>
 *   </ng-container>
 * </bs-tile-manager>
 * ```
 *
 * `of` is the manager's tile list, like `ngFor`'s: the manager reads it from here.
 */
@Directive({ selector: '[bsTile]' })
export class BsTileDirective<T extends MintTile = MintTile> {
  readonly templateRef = inject<TemplateRef<BsTileContext<T>>>(TemplateRef);
  /** The visible tiles, in DOM order. */
  readonly bsTileOf = input<readonly T[] | null | undefined>(undefined);

  static ngTemplateContextGuard<T extends MintTile>(_dir: BsTileDirective<T>, ctx: unknown): ctx is BsTileContext<T> {
    return true;
  }
}

/** A tile's header: the drag handle in `dragMode="header"`. Only valid inside `*bsTile`. */
@Directive({ selector: '[bsTileHeader]' })
export class BsTileHeaderDirective {
  constructor() {
    register('header');
  }
}

/** A tile's body. Only valid inside `*bsTile`. */
@Directive({ selector: '[bsTileContent]' })
export class BsTileContentDirective {
  constructor() {
    register('content');
  }
}

function register(slot: 'header' | 'content'): void {
  const slots = inject(BsTileSlots);
  const template = inject(TemplateRef);
  slots[slot] = template;
  inject(DestroyRef).onDestroy(() => {
    if (slots[slot] === template) slots[slot] = null;
  });
}
