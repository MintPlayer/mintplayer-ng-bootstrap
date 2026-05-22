import { ChangeDetectionStrategy, Component, TemplateRef, input, output, viewChild } from '@angular/core';
import { TilePosition } from '@mintplayer/web-components/tile-manager';
/**
 * One tile inside a `<bs-tile-manager>`.
 *
 * The component captures two `TemplateRef`s — one for the header (a child
 * `<bs-tile-header>`) and one for the body (everything else) — which the
 * manager projects into named slots on the underlying `<mp-tile-manager>`
 * web component (`${id}-header` and `${id}-content`).
 */
@Component({
  selector: 'bs-tile',
  template: `
    <ng-template #headerTpl>
      <ng-content select="bs-tile-header"></ng-content>
    </ng-template>
    <ng-template #contentTpl>
      <ng-content></ng-content>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTileComponent {
  readonly id = input.required<string>();
  readonly position = input.required<TilePosition>();
  readonly disableMove = input<boolean>(false);
  readonly disableResize = input<boolean>(false);
  readonly label = input<string | null>(null);

  readonly positionChange = output<TilePosition>();

  readonly headerTpl = viewChild.required<TemplateRef<unknown>>('headerTpl');
  readonly contentTpl = viewChild.required<TemplateRef<unknown>>('contentTpl');
}
