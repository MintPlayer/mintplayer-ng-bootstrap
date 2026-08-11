import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import hljs from 'highlight.js/lib/common';
import { hljsThemeStyles } from '../../_styles/hljs-theme.styles';
import { codeSnippetStyles } from './styles';
import { normalizeSource, splitHighlightedLines } from './core/split-lines';

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

  @state() private detectedLanguage = 'code';
  /** One highlighted HTML fragment per source line. */
  @state() private lines: string[] = [];
  @state() private toastVisible = false;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

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
  }

  private runHighlight(): void {
    const source = normalizeSource(this.code ?? '');
    if (!source) {
      this.lines = [];
      this.detectedLanguage = 'code';
      return;
    }

    let result: { value: string; language?: string };
    if (this.language) {
      try {
        result = hljs.highlight(source, { language: this.language, ignoreIllegals: true });
      } catch {
        // Unknown language id — fall back to auto-detect.
        result = hljs.highlightAuto(source);
      }
    } else {
      result = hljs.highlightAuto(source);
    }

    this.lines = splitHighlightedLines(result.value);
    const next = result.language ?? 'code';
    if (next !== this.detectedLanguage) {
      this.detectedLanguage = next;
      this.dispatchEvent(
        new CustomEvent<{ language: string }>('language-detected', {
          detail: { language: next },
          bubbles: true,
          composed: true,
        }),
      );
    }
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
        aria-label="${this.detectedLanguage} code sample"
      ><code part="code" class="hljs">${this.lines.map((line, i) => this.renderLine(line, i))}</code></pre>
      <div class="toast ${this.toastVisible ? 'visible' : ''}" part="toast" aria-hidden="${!this.toastVisible}">Copied!</div>
      <div class="sr-only" role="status" aria-live="polite">${this.toastVisible ? 'Copied to clipboard' : ''}</div>
    `;
  }

  /**
   * One row per source line. Written with no whitespace between the gutter and
   * the text: `.line` is a flex container, and under `white-space: pre` a
   * whitespace-only text node between flex items would NOT collapse away — it
   * would become an anonymous flex item and indent every line. (`.line` itself
   * therefore also resets `white-space`; only `.line-text` keeps `pre`.)
   */
  private renderLine(lineHtml: string, index: number): TemplateResult {
    const number = this.startLine + index;
    return html`<span class="line" part="line" id="L${number}"
      >${this.lineNumbers
        ? html`<span class="line-number" part="line-number" aria-hidden="true">${number}</span>`
        : nothing}<span class="line-text" part="line-text">${unsafeHTML(lineHtml)}</span></span
    >`;
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
