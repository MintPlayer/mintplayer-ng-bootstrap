import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, afterRenderEffect, ChangeDetectionStrategy, Component, computed, contentChild, ElementRef, inject, input, model, output, signal } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import {
  SHELL_SCOPE,
  applyShellState,
  connectShell,
  focusShellContent,
  shellScopedStyles,
  shouldDismissShell,
  toggleShell,
  type ShellLabels,
} from '@mintplayer/ui-core/shell';
import { BsShellState, BsShellStateChange } from '../shell-state';
import { BsShellSidebarDirective, BsShellTopbarDirective } from '../shell-sidebar/shell-sidebar.directive';

/**
 * `<bs-shell>` — responsive app shell with a collapsible sidebar (#437).
 *
 * Renders the markup of `@mintplayer/ui-core/shell` in its own template, so
 * the server-rendered page is the working shell: the open state is a native
 * checkbox per viewport mode and every rule is CSS, which makes the hamburger
 * work with JavaScript off. The host is the `.shell` root, so a height on
 * `bs-shell` bounds the layout and makes the content the scroll region.
 *
 *  - `*bsShellSidebar` marks the sidebar content;
 *  - `*bsShellTopbar` fills the top bar after the hamburger;
 *  - everything else is the main content.
 */
@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  imports: [MpPropsDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-mps]': 'view().root["data-mps"]',
    '[class.shell]': 'true',
    '[attr.data-breakpoint]': 'view().root["data-breakpoint"]',
    '[attr.data-external-toggle]': 'view().root["data-external-toggle"]',
    '[attr.data-mp-hydrated]': 'view().root["data-mp-hydrated"]',
    '[style.--mp-shell-size]': 'size()',
    '(click)': 'onClick($event)',
  },
})
export class BsShellComponent {
  readonly state = input<BsShellState>('auto');
  readonly breakpoint = input<Breakpoint>('md');
  /** Expanded sidebar width (any CSS length); also settable via `--mp-shell-size`. */
  readonly size = model<string | null>(null);
  /** Hides the built-in hamburger; drive the shell through `state` or `toggle()`. */
  readonly externalToggle = input(false);
  /** Auto-close the overlay drawer when a sidebar link is clicked (narrow mode only). */
  readonly dismissOnNavigate = input(false);
  /** Localized accessible names; missing keys fall back to English. */
  readonly labels = input<Partial<ShellLabels> | null>(null);

  /** Fires when the sidebar opens or closes through the shell. */
  readonly statechange = output<BsShellStateChange>();

  protected readonly sidebar = contentChild(BsShellSidebarDirective);
  protected readonly topbar = contentChild(BsShellTopbarDirective);

  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly id = inject(BsIdService).next('bs-shell');

  protected readonly view = computed(() => connectShell({
    id: this.id,
    state: this.state(),
    breakpoint: this.breakpoint(),
    externalToggle: this.externalToggle(),
    labels: this.labels(),
    hydrated: this.hydrated(),
  }));

  /** True once the listeners are attached (browser only), so e2e can wait on it. */
  private readonly hydrated = signal(false);

  constructor() {
    useScopedStyles(SHELL_SCOPE, shellScopedStyles);
    afterNextRender(() => this.hydrated.set(true));
    // The bags set the checkboxes' initial state (the `checked` attribute,
    // which is what SSR emits). A later `state` change must also reach a
    // checkbox the user already flipped, whose attribute no longer applies.
    let applied: BsShellState | null = null;
    afterRenderEffect(() => {
      const state = this.state();
      if (applied !== null && applied !== state) applyShellState(this.host, state);
      applied = state;
    });
  }

  /** Set the expanded sidebar width (any CSS length, e.g. `'20rem'`). */
  setSize(size: string) {
    this.size.set(size);
  }

  /** Open or close the sidebar in the current viewport mode. */
  toggle(force?: boolean) {
    const open = toggleShell(this.host, force);
    if (open !== null) this.statechange.emit({ open });
  }

  protected onToggleChange(event: Event) {
    this.statechange.emit({ open: (event.target as HTMLInputElement).checked });
  }

  protected onSkip(event: Event) {
    focusShellContent(event, this.host);
  }

  protected onClick(event: MouseEvent) {
    if (this.dismissOnNavigate() && shouldDismissShell(event, this.host)) this.toggle(false);
  }
}
