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
    :host {
      display: block;
      position: relative;
      font-family: var(--bs-font-monospace, ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace);
      background: var(--bs-tertiary-bg, #f6f8fa);
      color: var(--bs-body-color, #1f2328);
      border: 1px solid var(--bs-border-color, #d0d7de);
      border-radius: var(--bs-border-radius, 0.375rem);
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
      color: var(--bs-body-color, #1f2328);
      background: var(--bs-body-bg, #ffffff);
      border: 1px solid var(--bs-border-color, #d0d7de);
      border-radius: var(--bs-border-radius-sm, 0.25rem);
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
      color: var(--bs-body-bg, #ffffff);
      background: var(--bs-success, #198754);
      border-radius: var(--bs-border-radius-sm, 0.25rem);
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

    /* Minimal github-light hljs token colours. Consumers can override via
       ::part(code) + their own stylesheet if a different theme is wanted. */
    .hljs-comment, .hljs-quote { color: #6e7781; font-style: italic; }
    .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section, .hljs-link { color: #cf222e; }
    .hljs-function .hljs-keyword { color: #cf222e; }
    .hljs-subst { color: #1f2328; }
    .hljs-string, .hljs-attr, .hljs-symbol, .hljs-bullet, .hljs-meta, .hljs-addition { color: #0a3069; }
    .hljs-number, .hljs-regexp, .hljs-template-tag, .hljs-template-variable, .hljs-variable { color: #0550ae; }
    .hljs-title, .hljs-class .hljs-title, .hljs-type, .hljs-built_in, .hljs-builtin-name { color: #8250df; }
    .hljs-tag, .hljs-name { color: #116329; }
    .hljs-attribute { color: #0550ae; }
    .hljs-deletion { color: #82071e; background-color: #ffebe9; }
    .hljs-addition { color: #116329; background-color: #dafbe1; }
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
