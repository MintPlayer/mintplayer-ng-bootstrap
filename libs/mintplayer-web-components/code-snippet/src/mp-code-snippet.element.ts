import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { hljsThemeStyles } from '../../_styles/hljs-theme.styles';
import { codeSnippetStyles } from './styles';
import { escapeHtml, normalizeSource, splitHighlightedLines } from './core/split-lines';
import { highlight } from './core/highlighter';
import type { CodeLineAnnotation } from './types';

const TAG_NAME = 'mp-code-snippet';

/**
 * `<mp-code-snippet>` — code block with syntax highlighting + copy-to-clipboard.
 *
 * Replaces the Angular-only `bs-code-snippet`. All three demo apps
 * (Angular / React / Vue) render their per-page source snippets through
 * this WC for visual consistency.
 *
 * Attributes / properties:
 * - `language` (optional): force a specific highlight.js language. If
 *   omitted, the highlighter auto-detects.
 * - `code` (property): the source to render. Setting via attribute also
 *   works but the property form is preferred for multi-line content.
 *
 * Events:
 * - `language-detected` — fires after each highlight pass with
 *   `detail.language` containing the resolved language id (e.g. `"typescript"`).
 *
 * - `theme` (optional): `auto` (default) follows the page's Bootstrap theme,
 *   `light` / `dark` pin the palette regardless of the page.
 *
 * a11y: the copy button announces success via an `aria-live="polite"`
 * region inside the shadow root.
 *
 * Source content can ALSO be projected via the default slot — useful for
 * static HTML pages where attribute serialization of newlines is awkward.
 * Slot content is read once on first render and on `slotchange`.
 *
 * No-JS tier: NONE. With scripting disabled this element renders an empty
 * `<pre>` — the slot is hidden and only JS hoists its text into `code`. It
 * ships no Declarative-Shadow-DOM chrome and is not part of the
 * `codegen-ssr-chrome` aggregate.
 */
export class MpCodeSnippet extends LitElement {
  static override styles = [hljsThemeStyles, codeSnippetStyles];

  // No manual observedAttributes override needed: Lit's @property decorator
  // (with the default attribute: true) auto-registers 'language' and 'code'.
  @property({ type: String }) language = '';
  /**
   * Palette selection. `auto` inherits the page's `color-scheme` — which
   * Bootstrap sets from `data-bs-theme` and which crosses the shadow boundary
   * — so the default needs no wiring from the consumer. `light` / `dark`
   * constrain `color-scheme` on the host instead of redeclaring any colour.
   */
  @property({ type: String, reflect: true }) theme: 'auto' | 'light' | 'dark' = 'auto';
  /**
   * Accessible name for the copy button. Category-2 default derived from the
   * detected language; override for localisation. The ${language} placeholder
   * is substituted, so a translated pattern keeps the dynamic part.
   */
  @property({ type: String, attribute: 'copy-label' }) copyLabel = 'Copy ${language} code to clipboard';
  @property({ type: String }) code = '';

  /** Show a line-number gutter. Off by default — a one-line install command
   *  gains nothing from a `1` beside it. */
  @property({ type: Boolean, attribute: 'line-numbers', reflect: true }) lineNumbers = false;
  /** Number of the first rendered line, for excerpts lifted out of a file. */
  @property({ type: Number, attribute: 'start-line' }) startLine = 1;
  /** Wrap long lines instead of scrolling them horizontally. */
  @property({ type: Boolean, reflect: true }) wrap = false;

  /**
   * Per-line markers. Sparse — most lines carry none. Property only: an array
   * of objects has no sensible attribute form.
   */
  @property({ attribute: false }) annotations: CodeLineAnnotation[] = [];

  /**
   * The line drawn as current. Composes OVER an annotation rather than
   * replacing it (an outline, not a background swap), because "which line am I
   * looking at" and "what is the coverage of this line" are independent facts.
   */
  @property({ type: Number, attribute: 'active-line' }) activeLine: number | null = null;

  /**
   * Turns each line number into a real `<a href>`. Given as a function because
   * only the consumer knows what a link to a line means in their app.
   *
   * A real href — not a click handler — so middle-click, open-in-new-tab and
   * "copy link address" all work. A router-driven consumer listens for
   * `line-activate` and calls `preventDefault()` on it.
   */
  @property({ attribute: false }) lineHref: ((line: number) => string) | null = null;

  /**
   * Accessible name pattern for a line anchor; `${line}` is substituted.
   * Localisable, because an accessible name that only exists as an English
   * literal is a translation bug.
   */
  @property({ type: String, attribute: 'line-label' }) lineLabel = 'Line ${line}';

  /**
   * Accessible name for the code region. Defaults to a pattern derived from
   * the detected language; set it when the page has several snippets and
   * "typescript code sample" three times over is not navigable.
   */
  @property({ type: String }) label = '';

  /** Region name pattern used when `label` is empty. `${language}` is substituted. */
  @property({ type: String, attribute: 'region-label' }) regionLabel = '${language} code sample';

  /** Visible confirmation in the toast after a successful copy. */
  @property({ type: String, attribute: 'copied-label' }) copiedLabel = 'Copied!';

  /** What a screen reader hears after a successful copy. */
  @property({ type: String, attribute: 'copied-announcement' })
  copiedAnnouncement = 'Copied to clipboard';

  /**
   * Keyboard help for the line-anchor list, exposed as the region's
   * description so entering it reads the keymap once. Only rendered when
   * `lineHref` makes the anchors exist.
   */
  @property({ type: String, attribute: 'keymap-hint' })
  keymapHint =
    'Use the up and down arrow keys to move between line links, Home and End for the first and last line.';

  @state() private detectedLanguage = 'code';
  /** One highlighted HTML fragment per source line. */
  @state() private lines: string[] = [];
  @state() private toastVisible = false;
  /** Line whose anchor currently holds the roving tabindex. */
  @state() private rovingLine: number | null = null;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /** Rebuilt only when `annotations` changes — a per-row `.find()` would be
   *  quadratic on a file with an annotation per line. */
  private annotationsByLine = new Map<number, CodeLineAnnotation>();

  /** Guards against an out-of-order highlight resolving over a newer one. */
  private highlightToken = 0;

  /**
   * Explicit `label` wins; otherwise the pattern, so the region is never
   * nameless. The keymap is NOT folded in here — it belongs to the
   * description, and a name that grows a paragraph of help is unusable in a
   * landmark list.
   */
  private get regionName(): string {
    return this.label || this.regionLabel.replace('${language}', this.detectedLanguage);
  }

  /** Settles when the in-flight highlight has been applied. */
  private highlightPending: Promise<void> = Promise.resolve();

  /**
   * Keeps `await el.updateComplete` meaning what it has always meant: the
   * rendered output is on screen. Highlighting now resolves a chunk load AFTER
   * the first paint, so without this every consumer and every spec would have
   * to know to await something extra.
   */
  protected override async getUpdateComplete(): Promise<boolean> {
    await super.getUpdateComplete();
    await this.highlightPending;
    // Applying the highlight sets `lines`, scheduling one more update; await
    // that one too so the highlighted DOM is what the caller observes.
    return super.getUpdateComplete();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Initial slot content (when the element is parsed declaratively from
    // HTML) is picked up by `onSlotChange` once Lit attaches its rendered
    // <slot>. No textContent peek here — the parser ordering makes it
    // unreliable, and the slotchange handler covers both empty and
    // pre-populated cases.
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('code') || changed.has('language')) {
      this.runHighlight();
    }
    if (changed.has('annotations')) {
      this.annotationsByLine = new Map((this.annotations ?? []).map((a) => [a.line, a]));
    }
  }

  /**
   * Highlighting is asynchronous because the grammar is fetched on demand, so
   * this paints escaped plain text FIRST and upgrades in place when the
   * grammar lands. A block that flashes empty is worse than one that flashes
   * unstyled, and if the grammar never arrives the plain text is the final,
   * still-readable state rather than a blank box.
   */
  private runHighlight(): void {
    const source = normalizeSource(this.code ?? '');
    if (!source) {
      this.lines = [];
      this.setDetectedLanguage('code');
      return;
    }

    this.lines = splitHighlightedLines(escapeHtml(source));

    // Only the newest request may write. Without this, a fast grammar
    // resolving after a slow one would repaint with the previous source.
    const token = ++this.highlightToken;
    const language = this.language;

    // Assigned, not fire-and-forget: `getUpdateComplete` awaits this, which is
    // what keeps `await el.updateComplete` meaning "the highlighted output is
    // on screen".
    this.highlightPending = highlight(source, language).then(({ value, language: resolved, load }) => {
      if (token !== this.highlightToken) return;

      if (load === 'unknown-language') {
        console.warn(
          `[mp-code-snippet] unknown language "${language}" — rendering as plain text. ` +
            'Register it with registerLanguage() if it is outside the bundled set.',
        );
      } else if (load === 'load-failed') {
        console.warn(`[mp-code-snippet] failed to load the grammar for "${language || 'auto'}".`);
      }

      if (value) this.lines = splitHighlightedLines(value);
      this.setDetectedLanguage(resolved ?? 'code');
    });
  }

  private setDetectedLanguage(next: string): void {
    if (next === this.detectedLanguage) return;
    this.detectedLanguage = next;
    this.dispatchEvent(
      new CustomEvent<{ language: string }>('language-detected', {
        detail: { language: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code ?? '');
      this.showToast();
    } catch (err) {
      // Clipboard API unavailable (e.g. insecure context). Silently no-op;
      // the toast doesn't appear so the user knows it didn't work.
      console.warn('[mp-code-snippet] clipboard write failed', err);
    }
  }

  private showToast(): void {
    this.toastVisible = true;
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.toastTimer = null;
    }, 3000);
  }

  override render(): TemplateResult {
    return html`
      <slot @slotchange=${this.onSlotChange}></slot>
      <button
        type="button"
        class="copy"
        part="copy-button"
        @click=${this.handleCopy}
        aria-label="${this.copyLabel.replace('${language}', this.detectedLanguage)}"
      >Copy ${this.detectedLanguage}</button>
      <pre
        part="pre"
        tabindex="0"
        role="region"
        aria-label="${this.regionName}"
        aria-describedby="${this.lineHref ? 'keymap' : nothing}"
      ><code part="code" class="hljs">${Array.from({ length: this.rowCount }, (_, i) =>
          this.renderLine(i),
        )}</code></pre>
      ${this.lineHref
        ? html`<div id="keymap" class="sr-only">${this.keymapHint}</div>`
        : nothing}
      <div class="toast ${this.toastVisible ? 'visible' : ''}" part="toast" aria-hidden="${!this.toastVisible}">${this.copiedLabel}</div>
      <div class="sr-only" role="status" aria-live="polite">${this.toastVisible ? this.copiedAnnouncement : ''}</div>
    `;
  }

  /**
   * Rows to render. Normally one per source line, but annotations may name
   * lines beyond the source's extent — a coverage report for a file whose
   * source could not be fetched still renders its full gutter — so the count
   * is the larger of the two.
   */
  private get rowCount(): number {
    const lastAnnotated = this.annotations.reduce((max, a) => Math.max(max, a.line), 0);
    const fromAnnotations = lastAnnotated === 0 ? 0 : lastAnnotated - this.startLine + 1;
    return Math.max(this.lines.length, fromAnnotations);
  }

  /** Scroll a line into view. A method, not a side effect of `activeLine`, so
   *  re-requesting the line the user is already on still scrolls. */
  scrollToLine(line: number): void {
    this.renderRoot
      ?.querySelector(`#L${line}`)
      ?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }

  private onLineActivate(line: number, event: Event): void {
    const proceed = this.dispatchEvent(
      new CustomEvent<{ line: number }>('line-activate', {
        detail: { line },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    // A consumer that handles navigation itself cancels the event; the real
    // href stays in the DOM either way so middle-click keeps working.
    if (!proceed) event.preventDefault();
  }

  /**
   * One row per line. Written with no whitespace between the gutter and the
   * text: `.line` is a flex container, and under `white-space: pre` a
   * whitespace-only text node between flex items would NOT collapse away — it
   * would become an anonymous flex item and indent every line. (`.line` itself
   * therefore also resets `white-space`; only `.line-text` keeps `pre`.)
   */
  private renderLine(index: number): TemplateResult {
    const number = this.startLine + index;
    const annotation = this.annotationFor(number);
    const active = this.activeLine === number;
    const name = this.lineLabel.replace('${line}', String(number));

    // `part` is the styling channel for annotations: `kind` is an opaque
    // consumer string, so there is no rule this component could ship for it.
    const parts = ['line', annotation?.kind ? `annotation-${annotation.kind}` : '', active ? 'active-line' : '']
      .filter(Boolean)
      .join(' ');

    return html`<span
      class="line${active ? ' active' : ''}${annotation ? ' annotated' : ''}"
      part="${parts}"
      id="L${number}"
      title="${annotation?.description ?? nothing}"
      >${this.lineNumbers ? this.renderGutter(number, name) : nothing}${annotation &&
      (annotation.label !== undefined || annotation.secondaryLabel !== undefined)
        ? html`<span class="line-marks" part="line-marks" aria-hidden="true"
            >${annotation.label !== undefined
              ? html`<span class="line-mark" part="line-mark">${annotation.label}</span>`
              : nothing}${annotation.secondaryLabel !== undefined
              ? html`<span class="line-mark secondary" part="line-mark-secondary"
                  >${annotation.secondaryLabel}</span
                >`
              : nothing}</span
          >`
        : nothing}<span class="line-text" part="line-text">${unsafeHTML(this.lines[index] ?? '')}</span
      >${annotation?.description
        ? html`<span class="sr-only">${annotation.description}</span>`
        : nothing}</span
    >`;
  }

  /**
   * The gutter is a real link when `lineHref` is set and inert text otherwise.
   * Inert text is `aria-hidden`: an unlinked line number is decoration, and
   * announcing "42" before every line would drown the code.
   *
   * The links carry a ROVING tabindex — exactly one is tabbable and the arrow
   * keys move between them. A file view puts one anchor per line in the DOM,
   * so without this a 2 000-line file would be 2 000 tab stops between the
   * reader and the rest of the page.
   */
  private renderGutter(number: number, name: string): TemplateResult {
    if (!this.lineHref) {
      return html`<span class="line-number" part="line-number" aria-hidden="true">${number}</span>`;
    }
    return html`<a
      class="line-number"
      part="line-number"
      href="${this.lineHref(number)}"
      aria-label="${name}"
      tabindex="${number === this.tabbableLine ? 0 : -1}"
      @click=${(e: Event) => this.onLineActivate(number, e)}
      @keydown=${(e: KeyboardEvent) => this.onGutterKeydown(number, e)}
      >${number}</a
    >`;
  }

  /**
   * The single tabbable line link: wherever the user last was, else the active
   * line, else the first. Landing on the active line means Tab reaches the
   * line the consumer considers current rather than the top of a long file.
   */
  private get tabbableLine(): number {
    return this.rovingLine ?? this.activeLine ?? this.startLine;
  }

  private onGutterKeydown(number: number, event: KeyboardEvent): void {
    const first = this.startLine;
    const last = this.startLine + this.rowCount - 1;

    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = Math.min(number + 1, last);
        break;
      case 'ArrowUp':
        next = Math.max(number - 1, first);
        break;
      case 'Home':
        next = first;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    // Arrow keys would otherwise scroll the region out from under the focus
    // we are about to move.
    event.preventDefault();
    if (next === number) return;
    this.rovingLine = next;
    void this.moveFocusToLine(next);
  }

  /**
   * Focus follows the roving index by stable LINE NUMBER, never by DOM index:
   * the rows are rebuilt on every highlight, and an index would land on
   * whatever now occupies that position.
   */
  private async moveFocusToLine(line: number): Promise<void> {
    await this.updateComplete;
    this.renderRoot?.querySelector<HTMLElement>(`#L${line} a.line-number`)?.focus();
  }

  private annotationFor(line: number): CodeLineAnnotation | undefined {
    return this.annotationsByLine.get(line);
  }

  private onSlotChange(e: Event): void {
    if (this.code) return; // Property already set; slot is decorative.
    const slot = e.target as HTMLSlotElement;
    const text = slot
      .assignedNodes({ flatten: true })
      .map((n) => n.textContent ?? '')
      .join('')
      .trim();
    if (text) this.code = text;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, MpCodeSnippet);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-code-snippet': MpCodeSnippet;
  }
}
