import { LitElement, html, css, type TemplateResult, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import hljs from 'highlight.js/lib/common';

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
 * a11y: the copy button announces success via an `aria-live="polite"`
 * region inside the shadow root.
 *
 * Source content can ALSO be projected via the default slot — useful for
 * static HTML pages where attribute serialization of newlines is awkward.
 * Slot content is read once on first render and on `slotchange`.
 */
export class MpCodeSnippet extends LitElement {
  static override styles = css`
    /* Verbatim port of highlight.js's a11y-dark.css — the same theme
       the master branch's ngx-highlightjs setup loads for the Angular
       demo. That theme has only a dark variant; the code-snippet
       intentionally renders dark-on-light-page like in an IDE, so the
       host's own background is fixed (no Bootstrap data-bs-theme
       branch). Tokens not explicitly mapped (e.g. .hljs-attr inside
       .hljs-tag) inherit from their parent, matching production. */
    :host {
      display: block;
      position: relative;
      font-family: var(--bs-font-monospace);
      background: #2b2b2b;
      color: #f8f8f2;
      border: 1px solid var(--bs-border-color);
      border-radius: var(--bs-border-radius);
      overflow: hidden;
    }

    pre {
      margin: 0;
      padding: 1rem 1rem 1rem 1rem;
      overflow-x: auto;
      white-space: pre;
      tab-size: 2;
    }

    code {
      display: block;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      color: inherit;
    }

    .copy {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      color: var(--bs-body-color);
      background: var(--bs-body-bg);
      border: 1px solid var(--bs-border-color);
      border-radius: var(--bs-border-radius-sm);
      cursor: pointer;
      opacity: 0.85;
      transition: opacity 120ms ease;
    }

    .copy:hover,
    .copy:focus-visible {
      opacity: 1;
    }

    .toast {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      color: var(--bs-body-bg);
      background: var(--bs-success);
      border-radius: var(--bs-border-radius-sm);
      opacity: 0;
      transform: translateY(0.5rem);
      transition: opacity 150ms ease, transform 150ms ease;
      pointer-events: none;
    }

    .toast.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Default slot is hidden; content is hoisted into the <code> on each render. */
    slot { display: none; }

    /* a11y-dark token → colour mapping. Selectors + colours are a 1:1
       port of highlight.js's a11y-dark.css. Tokens not listed here
       (.hljs-attr, .hljs-property, .hljs-operator, .hljs-doctag, etc.)
       intentionally inherit from their nearest mapped ancestor — that's
       the canonical behaviour and matches the master branch's rendering. */
    /* Comment */
    .hljs-comment, .hljs-quote { color: #d4d0ab; }
    /* Red */
    .hljs-variable, .hljs-template-variable, .hljs-tag, .hljs-name,
    .hljs-selector-id, .hljs-selector-class, .hljs-regexp,
    .hljs-deletion { color: #ffa07a; }
    /* Orange */
    .hljs-number, .hljs-built_in, .hljs-literal, .hljs-type,
    .hljs-params, .hljs-meta, .hljs-link { color: #f5ab35; }
    /* Yellow */
    .hljs-attribute { color: #ffd700; }
    /* Green */
    .hljs-string, .hljs-symbol, .hljs-bullet,
    .hljs-addition { color: #abe338; }
    /* Blue */
    .hljs-title, .hljs-section { color: #00e0e0; }
    /* Purple */
    .hljs-keyword, .hljs-selector-tag { color: #dcc6e0; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: bold; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: 600; }
  `;

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'language', 'code'];
  }

  @property({ type: String }) language = '';
  @property({ type: String }) code = '';

  @state() private detectedLanguage = 'code';
  @state() private highlighted = '';
  @state() private toastVisible = false;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.code) {
      // Late binding: pull initial source from default slot text content.
      const slotted = this.textContent?.trim();
      if (slotted) this.code = slotted;
    }
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
    const source = this.code ?? '';
    if (!source) {
      this.highlighted = '';
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

    this.highlighted = result.value;
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
        aria-label="Copy ${this.detectedLanguage} code to clipboard"
      >Copy ${this.detectedLanguage}</button>
      <pre part="pre"><code part="code" class="hljs">${unsafeHTML(this.highlighted || this.escapeHtml(this.code))}</code></pre>
      <div class="toast ${this.toastVisible ? 'visible' : ''}" part="toast" aria-hidden="${!this.toastVisible}">Copied!</div>
      <div class="sr-only" role="status" aria-live="polite">${this.toastVisible ? 'Copied to clipboard' : ''}</div>
    `;
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

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
