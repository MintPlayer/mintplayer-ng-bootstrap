import { DOCUMENT } from '@angular/common';
import { AfterContentInit, AfterViewInit, ChangeDetectionStrategy, Component, computed, contentChildren, effect, ElementRef, inject, input, signal, viewChildren } from '@angular/core';
import { BsScrollOffsetService } from '../services/scroll-offset/scroll-offset.service';
import { BsScrollspyDirective } from '../directives/scrollspy.directive';

type ScrollTarget = HTMLElement | Window;

@Component({
  selector: 'bs-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsScrollspyComponent implements AfterViewInit, AfterContentInit {

  private scrollOffsetService = inject(BsScrollOffsetService);
  private hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  doc = inject<Document>(DOCUMENT);

  readonly scrollContainer = input<HTMLElement | null>(null);

  private viewInit = signal<boolean>(false);
  private contentInit = signal<boolean>(false);

  readonly directives = contentChildren(BsScrollspyDirective, { descendants: true });
  readonly anchors = viewChildren<ElementRef<HTMLButtonElement>>('anchor');

  activeDirective = signal<BsScrollspyDirective | null>(null);

  private resolvedScrollTarget = computed<ScrollTarget | null>(() => {
    if (typeof window === 'undefined') return null;
    if (!this.viewInit()) return null;
    const explicit = this.scrollContainer();
    if (explicit) return explicit;
    return this.findScrollableAncestor(this.hostRef.nativeElement) ?? window;
  });

  constructor() {
    effect(() => {
      const viewInit = this.viewInit();
      const contentInit = this.contentInit();
      if (viewInit && contentInit) {
        this.scrollToCurrentInSpy();
      }
    });

    effect((onCleanup) => {
      const target = this.resolvedScrollTarget();
      this.directives();
      if (!target) return;

      const handler = () => {
        this.setActiveDirective();
        this.scrollToCurrentInSpy();
      };
      target.addEventListener('scroll', handler, { passive: true });
      handler();

      onCleanup(() => target.removeEventListener('scroll', handler));
    });
  }

  ngAfterViewInit() {
    this.viewInit.set(true);
  }

  ngAfterContentInit() {
    this.contentInit.set(true);
  }

  setActiveDirective() {
    const triggerY = this.getTriggerY();
    const allDirectives = this.directives();
    const dirs = allDirectives.filter((d) => d.element.nativeElement.getBoundingClientRect().y < triggerY);

    if (allDirectives.length === 0) {
      this.activeDirective.set(null);
    } else if (dirs.length === 0) {
      this.activeDirective.set(allDirectives[0] ?? null);
    } else {
      this.activeDirective.set(dirs[dirs.length - 1]);
    }
  }

  scrollToCurrentInSpy() {
    if ((typeof window !== 'undefined') && (window.innerWidth >= 768)) {
      if (this.activeDirective()) {
        const index = this.directives().findIndex((v) => v === this.activeDirective());
        const anchor = this.anchors()[index];
        if (anchor && anchor.nativeElement.parentElement) {
          // Optional-chain so jsdom (no scrollIntoView impl) does not crash
          // when the effect calls this synchronously during component init.
          anchor.nativeElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        }
      }
    }
  }

  scrollToHeader(directive: BsScrollspyDirective) {
    if (typeof window === 'undefined') return;
    const target = this.resolvedScrollTarget();
    if (!target) return;

    const header = directive.element.nativeElement;
    const headerTop = header.getBoundingClientRect().top;

    // `instanceof HTMLElement` narrows TS to HTMLElement in the true branch
    // and is robust in jsdom (which implements HTMLElement). The previous
    // `instanceof Window` check failed in jsdom due to a realm mismatch.
    if (target instanceof HTMLElement) {
      const containerTop = target.getBoundingClientRect().top;
      target.scrollTo({ top: headerTop - containerTop + target.scrollTop + 1, behavior: 'smooth' });
    } else {
      const offsetY = this.scrollOffsetService.getScrollOffset()[1];
      window.scrollTo({ top: headerTop + window.scrollY - offsetY + 1, behavior: 'smooth' });
    }
  }

  private getTriggerY(): number {
    const target = this.resolvedScrollTarget();
    // +1 in both branches so a directive landing exactly on the trigger line
    // (e.g. right after scrollToHeader completes) is counted as "above" it,
    // matching the +1 that scrollToHeader adds when computing the scroll target.
    if (target instanceof HTMLElement) {
      return target.getBoundingClientRect().top + 1;
    }
    return this.scrollOffsetService.getScrollOffset()[1] + 1;
  }

  private findScrollableAncestor(start: HTMLElement): HTMLElement | null {
    // Walk the element + its ancestors. The host itself participates so a
    // consumer can opt in by setting overflow-y: auto on <bs-scrollspy>.
    // We rely only on the declared overflow style (no scrollHeight check) —
    // a container declared overflow: auto is the consumer's intended scroll
    // target whether or not the content currently exceeds the box.
    let el: HTMLElement | null = start;
    while (el) {
      const style = getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }
}
