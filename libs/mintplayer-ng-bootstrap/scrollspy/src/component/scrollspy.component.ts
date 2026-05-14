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
          anchor.nativeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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

    if (target instanceof Window) {
      const offsetY = this.scrollOffsetService.getScrollOffset()[1];
      target.scrollTo({ top: headerTop + window.scrollY - offsetY + 1, behavior: 'smooth' });
    } else {
      const containerTop = target.getBoundingClientRect().top;
      target.scrollTo({ top: headerTop - containerTop + target.scrollTop + 1, behavior: 'smooth' });
    }
  }

  private getTriggerY(): number {
    const target = this.resolvedScrollTarget();
    if (!target || target instanceof Window) {
      return this.scrollOffsetService.getScrollOffset()[1];
    }
    return target.getBoundingClientRect().top + 1;
  }

  private findScrollableAncestor(start: HTMLElement): HTMLElement | null {
    let el: HTMLElement | null = start.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }
}
