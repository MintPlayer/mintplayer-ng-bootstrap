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
      font-family: var(--bs-font-monospace);
      background: var(--bs-tertiary-bg);
      color: var(--bs-body-color);
      border: 1px solid var(--bs-border-color);
      border-radius: var(--bs-border-radius);
      overflow: hidden;

      /* VS Code Light+ palette — vibrant defaults for every language
         the demos use (TypeScript, JSX/TSX, Vue SFC, HTML, SCSS/CSS,
         JSON, shell). Bootstrap's --bs-*-text-emphasis vars are too
         desaturated for syntax highlighting (it all came out grey),
         so we hand-pick a token palette here. The dark-mode override
         below mirrors VS Code Dark+. */
      --mp-snippet-comment:    #008000;
      --mp-snippet-keyword:    #0000ff;
      --mp-snippet-string:     #a31515;
      --mp-snippet-number:     #098658;
      --mp-snippet-type:       #267f99;
      --mp-snippet-tag:        #800000;
      --mp-snippet-attribute:  #e50000;
      --mp-snippet-variable:   #001080;
      --mp-snippet-function:   #795e26;
      --mp-snippet-meta:       #af00db;
      --mp-snippet-regexp:     #811f3f;
      --mp-snippet-deletion-fg:#82071e;
      --mp-snippet-deletion-bg:#ffebe9;
      --mp-snippet-addition-fg:#116329;
      --mp-snippet-addition-bg:#dafbe1;
    }

    /* VS Code Dark+ palette. Switches with the explicit Bootstrap
       data-bs-theme attribute (NOT the system preference). */
    :host-context([data-bs-theme='dark']) {
      --mp-snippet-comment:    #6a9955;
      --mp-snippet-keyword:    #569cd6;
      --mp-snippet-string:     #ce9178;
      --mp-snippet-number:     #b5cea8;
      --mp-snippet-type:       #4ec9b0;
      --mp-snippet-tag:        #569cd6;
      --mp-snippet-attribute:  #9cdcfe;
      --mp-snippet-variable:   #9cdcfe;
      --mp-snippet-function:   #dcdcaa;
      --mp-snippet-meta:       #c586c0;
      --mp-snippet-regexp:     #d16969;
      --mp-snippet-deletion-fg:#ffdcd7;
      --mp-snippet-deletion-bg:#67060c;
      --mp-snippet-addition-fg:#aff5b4;
      --mp-snippet-addition-bg:#033a16;
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

    /* hljs token → semantic colour mapping. Covers TypeScript / JSX /
       Vue SFC / HTML / SCSS / CSS / JSON / shell at minimum; any
       other hljs language falls through to the same token classes. */
    .hljs-comment, .hljs-quote, .hljs-doctag { color: var(--mp-snippet-comment); font-style: italic; }
    .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section, .hljs-link, .hljs-selector-pseudo, .hljs-selector-class, .hljs-selector-id { color: var(--mp-snippet-keyword); }
    .hljs-function .hljs-keyword { color: var(--mp-snippet-keyword); }
    .hljs-subst { color: inherit; }
    .hljs-string, .hljs-symbol, .hljs-bullet { color: var(--mp-snippet-string); }
    .hljs-number, .hljs-operator { color: var(--mp-snippet-number); }
    .hljs-regexp { color: var(--mp-snippet-regexp); }
    .hljs-type, .hljs-built_in, .hljs-builtin-name, .hljs-class .hljs-title { color: var(--mp-snippet-type); }
    .hljs-tag, .hljs-name { color: var(--mp-snippet-tag); }
    .hljs-attr, .hljs-attribute, .hljs-property { color: var(--mp-snippet-attribute); }
    .hljs-variable, .hljs-template-variable, .hljs-template-tag, .hljs-params { color: var(--mp-snippet-variable); }
    .hljs-title, .hljs-title.function_ { color: var(--mp-snippet-function); }
    .hljs-meta, .hljs-meta-keyword, .hljs-meta-string { color: var(--mp-snippet-meta); }
    .hljs-deletion { color: var(--mp-snippet-deletion-fg); background-color: var(--mp-snippet-deletion-bg); }
    .hljs-addition { color: var(--mp-snippet-addition-fg); background-color: var(--mp-snippet-addition-bg); }
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
