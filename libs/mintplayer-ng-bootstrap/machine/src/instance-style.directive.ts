import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, effect, inject, input } from '@angular/core';
import { SCOPED_STYLE_MARKER, writeScopedStyleTag } from '@mintplayer/ui-core/scoped-styles';

/**
 * A compiled template's `<instance-style :name :css />` (#458 M4): one instance's own
 * sheet, the tile manager's server layout rules. Angular strips `<style>` from
 * templates, so the sheet goes into the document head under `name`, on the server
 * (where it ships in the HTML) and on the client alike. A null `css` removes it, as
 * does destroying the component.
 */
@Directive({ selector: 'ng-container[mpInstanceStyle]' })
export class MpInstanceStyleDirective {
  readonly mpInstanceStyle = input<string | null>(null);
  readonly mpInstanceStyleName = input.required<string>();

  constructor() {
    const doc = inject(DOCUMENT);
    let written: string | null = null;
    const remove = () => {
      if (written !== null) doc.head?.querySelector(`style[${SCOPED_STYLE_MARKER}="${written}"]`)?.remove();
      written = null;
    };
    effect(() => {
      const css = this.mpInstanceStyle();
      const name = this.mpInstanceStyleName();
      if (written !== name) remove();
      if (!css) return remove();
      writeScopedStyleTag(doc, name, css, { replace: true });
      written = name;
    });
    inject(DestroyRef).onDestroy(remove);
  }
}
