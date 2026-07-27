import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  forwardRef,
  input,
  viewChild,
} from '@angular/core';
// Eager side-effect registration: the SSR chrome is injected as Declarative
// Shadow DOM, so there is no unstyled window to protect by deferring.
import '@mintplayer/web-components/accordion';
import type { AccordionTabToggleDetail, MpAccordion } from '@mintplayer/web-components/accordion';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

/**
 * `<bs-accordion>` — Angular wrapper around the `<mp-accordion>` web component.
 *
 *     <bs-accordion [multi]="true">
 *       <bs-accordion-tab [(isActive)]="open">
 *         <ng-container *bsAccordionTabHeader>Profile</ng-container>
 *         Body content
 *       </bs-accordion-tab>
 *     </bs-accordion>
 *
 * Each tab's header is HOISTED out of the tab and rendered here, as a sibling
 * of the tab's own marker element. Named slots only accept direct children of
 * the shadow host, and an Angular component can only render inside its own
 * host element — so a header authored inside `<bs-accordion-tab>` could never
 * reach the accordion's shadow on its own. `*bsAccordionTabHeader` captures it
 * as a template that this component renders in the right place.
 *
 * The WC owns interaction, ARIA, animation and the no-JS tier; this wrapper
 * bridges inputs to attributes and the toggle event back into each tab's
 * `isActive` model.
 */
@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsAccordionComponent {
  /** Allow several tabs to stay open at once (checkbox machine with JS off). */
  readonly multi = input(false);
  /** Paint the open header with the Bootstrap active background. */
  readonly highlightActiveTab = input(false);

  readonly tabPages = contentChildren<BsAccordionTabComponent>(
    forwardRef(() => BsAccordionTabComponent),
  );

  protected readonly element = viewChild<ElementRef<MpAccordion>>('element');

  protected readonly multiAttr = computed(() => (this.multi() ? '' : null));
  protected readonly highlightActiveTabAttr = computed(() =>
    this.highlightActiveTab() ? '' : null,
  );

  /** Close every open tab, and every accordion nested inside them. */
  closeAll(): void {
    this.element()?.nativeElement.closeAll();
  }

  /** Drive a tab through the WC so nested accordions collapse with it. */
  setActive(index: number, active: boolean): void {
    const accordion = this.element()?.nativeElement;
    if (active) accordion?.open(index);
    else accordion?.close(index);
  }

  protected onTabToggle(event: Event): void {
    // Nesting is the normal case here and the WC's event is composed, so a
    // descendant accordion's toggles pass straight through this host. Claim
    // only our own — then stop, since this accordion has already handled it.
    if (event.target !== this.element()?.nativeElement) return;
    event.stopPropagation();

    const detail = (event as CustomEvent<AccordionTabToggleDetail>).detail;
    this.tabPages()[detail.index]?.isActive.set(detail.active);
  }
}
