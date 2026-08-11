import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import '@mintplayer/web-components/code-snippet';
import type { CodeLineAnnotation, MpCodeSnippet } from '@mintplayer/web-components/code-snippet';

/** Host attributes that describe the CONTROL and must reach it, not sit on a
 *  wrapper the accessibility tree does not care about. */
const FORWARDED_ATTRIBUTES = ['role', 'tabindex', 'id'];

/**
 * Angular wrapper around `<mp-code-snippet>`. The WC owns highlighting,
 * copy-to-clipboard, line rendering and the roving-focus keyboard layer; this
 * component translates Angular input/output ergonomics onto it.
 *
 * Breaking changes:
 * - `codeToCopy` is now `code`, matching the property it forwards to.
 * - The code block follows `data-bs-theme` instead of being permanently dark.
 *   Pass `theme="dark"` to keep the old appearance.
 * - `offcanvasVisible` (model) and `copiedTemplate` (viewChild) are long gone;
 *   the WC manages its own toast.
 *
 * CSS overrides go through parts: `::part(copy-button)`, `::part(pre)`,
 * `::part(code)`, `::part(line)`, `::part(line-number)`, `::part(toast)`, and
 * `::part(annotation-<kind>)` for whatever kinds you feed `annotations`.
 */
@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-block' },
})
export class BsCodeSnippetComponent implements AfterViewInit {
  readonly code = input<string>('');
  readonly language = input<string>('');

  readonly lineNumbers = input<boolean>(false);
  readonly startLine = input<number>(1);
  readonly wrap = input<boolean>(false);
  readonly theme = input<'auto' | 'light' | 'dark'>('auto');

  /** Sparse per-line markers; see `CodeLineAnnotation`. */
  readonly annotations = input<CodeLineAnnotation[]>([]);
  readonly activeLine = input<number | null>(null);
  /** Turns each line number into a real link, so middle-click still works. */
  readonly lineHref = input<((line: number) => string) | null>(null);

  readonly label = input<string>('');
  readonly copyLabel = input<string>('');
  readonly lineLabel = input<string>('');

  readonly detectedLanguage = output<string>();
  readonly lineActivate = output<number>();

  private readonly element = viewChild.required<ElementRef<MpCodeSnippet>>('element');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    this.forwardHostAttributes();
  }

  /**
   * Scroll a line into view. Delegated to the element rather than reimplemented
   * so that re-requesting the line the user is already on still scrolls — a
   * plain `activeLine` binding would no-op.
   */
  scrollToLine(line: number): void {
    this.element().nativeElement.scrollToLine(line);
  }

  /**
   * A consumer writing `aria-label` or `role` on `<bs-code-snippet>` means it
   * for the code block. Left on the Angular host it reaches nothing: the host
   * is a roleless div as far as AT is concerned. So the attributes are moved
   * onto the `mp-*` element and removed from the host, where a duplicate would
   * otherwise produce two named nodes.
   */
  private forwardHostAttributes(): void {
    const host = this.host.nativeElement;
    const target = this.element().nativeElement as unknown as HTMLElement;

    const names = [...host.getAttributeNames()].filter(
      (name) => name.startsWith('aria-') || FORWARDED_ATTRIBUTES.includes(name),
    );

    for (const name of names) {
      const value = host.getAttribute(name);
      if (value === null) continue;
      target.setAttribute(name, value);
      host.removeAttribute(name);
    }
  }

  protected onLanguageDetected(event: Event): void {
    this.detectedLanguage.emit((event as CustomEvent<{ language: string }>).detail.language);
  }

  protected onLineActivate(event: Event): void {
    this.lineActivate.emit((event as CustomEvent<{ line: number }>).detail.line);
  }
}
