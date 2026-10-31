import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useBootstrap, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import {
  ACCORDION_SCOPE,
  accordionKeydown,
  accordionRows,
  accordionScopedStyles,
  accordionSummaryClick,
  accordionToggled,
  closeAccordion,
  connectAccordion,
  connectAccordionTab,
} from '@mintplayer/ui-core/accordion';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';
import { bootstrapAccordion } from '@mintplayer/ui-core/bootstrap';

/**
 * `<bs-accordion>` — Bootstrap accordion on native `<details name>` (#437).
 *
 *     <bs-accordion [multi]="true">
 *       <bs-accordion-tab [(isActive)]="open">
 *         <ng-container *bsAccordionTabHeader>Profile</ng-container>
 *         Body content
 *       </bs-accordion-tab>
 *     </bs-accordion>
 *
 * Renders the markup of `@mintplayer/ui-core/accordion` in its own template,
 * so the server-rendered page is the working accordion: each tab is a
 * `<details>`, which opens and closes with JavaScript off, and single-open is
 * the platform's `name` exclusivity. The host is the `.accordion` root.
 *
 * The rows are rendered here, as siblings, rather than by each tab: Bootstrap
 * draws the borders between items with `:first-of-type`, which a per-tab host
 * element would break. Each tab hands over its header and body as templates.
 */
@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MpPropsDirective, NgTemplateOutlet],
  host: {
    '[attr.data-mps]': 'root()["data-mps"]',
    '[class.accordion]': 'true',
    '[attr.data-highlight-active]': 'root()["data-highlight-active"]',
  },
})
export class BsAccordionComponent {
  /** Allow several tabs to stay open at once. */
  readonly multi = input(false);
  /** Paint the open header with the Bootstrap active background. */
  readonly highlightActiveTab = input(false);

  readonly tabPages = contentChildren<BsAccordionTabComponent>(
    forwardRef(() => BsAccordionTabComponent),
  );

  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly id = inject(BsIdService).next('bs-accordion');

  private readonly options = computed(() => ({
    id: this.id,
    multi: this.multi(),
    highlightActiveTab: this.highlightActiveTab(),
  }));
  protected readonly root = computed(() => connectAccordion(this.options()));
  protected readonly views = computed(() =>
    this.tabPages().map((tab, index) => connectAccordionTab(this.options(), index, { disabled: tab.disabled() })),
  );

  constructor() {
    useBootstrap(bootstrapAccordion);
    useScopedStyles(ACCORDION_SCOPE, accordionScopedStyles);
    // `toggle` does not bubble, so a host listener never hears it: one
    // capture-phase listener on the root hears every row.
    const onToggle = (event: Event) => {
      const change = accordionToggled(this.host, event, this.multi());
      if (change) this.tabPages()[change.index]?.isActive.set(change.active);
    };
    this.host.addEventListener('toggle', onToggle, { capture: true });
    inject(DestroyRef).onDestroy(() => this.host.removeEventListener('toggle', onToggle, { capture: true }));
  }

  /** Close every open tab, and every accordion nested inside them. */
  closeAll(): void {
    closeAccordion(this.host);
  }

  /**
   * Open or close a tab through its `<details>`, so single-open exclusivity
   * and the nested-accordion collapse both apply.
   */
  setActive(index: number, active: boolean): void {
    const row = accordionRows(this.host)[index];
    if (row) row.open = active;
  }

  protected onSummaryClick(event: Event, tab: BsAccordionTabComponent): void {
    accordionSummaryClick(event, tab.disabled());
  }

  protected onSummaryKeydown(event: KeyboardEvent, index: number, tab: BsAccordionTabComponent): void {
    accordionKeydown(this.host, event, index, tab.disabled());
  }
}
