import { Directive, inject, input, TemplateRef } from '@angular/core';
import type { MintTile } from '@mintplayer/ui-core/tile-manager';

/** The context of a `*bsTileHeader` / `*bsTileContent` template: the tile it renders. */
export interface BsTileTemplateContext<T extends MintTile = MintTile> {
  $implicit: T;
}

/**
 * Renders a tile's header, the drag handle in `dragMode="header"`. Declared once inside
 * `<bs-tile-manager>` and stamped per tile.
 *
 * ```html
 * <bs-tile-manager [tiles]="tiles()" [(layouts)]="layouts">
 *   <ng-container *bsTileHeader="let tile; of: tiles()">{{ tile.title }}</ng-container>
 *   <ng-container *bsTileContent="let tile; of: tiles()">{{ tile.body }}</ng-container>
 * </bs-tile-manager>
 * ```
 *
 * `of:` is optional and only carries the tile type into the template (like `ngFor`'s `of`).
 */
@Directive({ selector: '[bsTileHeader]' })
export class BsTileHeaderDirective<T extends MintTile = MintTile> {
  readonly templateRef = inject<TemplateRef<BsTileTemplateContext<T>>>(TemplateRef);
  /** Type carrier only; never read at runtime. */
  readonly bsTileHeaderOf = input<readonly T[] | T | null | undefined>(undefined);

  static ngTemplateContextGuard<T extends MintTile>(_dir: BsTileHeaderDirective<T>, ctx: unknown): ctx is BsTileTemplateContext<T> {
    return true;
  }
}

/** Renders a tile's body. See `BsTileHeaderDirective`. */
@Directive({ selector: '[bsTileContent]' })
export class BsTileContentDirective<T extends MintTile = MintTile> {
  readonly templateRef = inject<TemplateRef<BsTileTemplateContext<T>>>(TemplateRef);
  /** Type carrier only; never read at runtime. */
  readonly bsTileContentOf = input<readonly T[] | T | null | undefined>(undefined);

  static ngTemplateContextGuard<T extends MintTile>(_dir: BsTileContentDirective<T>, ctx: unknown): ctx is BsTileTemplateContext<T> {
    return true;
  }
}
