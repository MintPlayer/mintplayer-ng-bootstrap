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

      /* a11y-light palette — same hljs theme family the master branch
         shipped (a11y-dark) but the light counterpart. WCAG AA contrast
         against a near-white background. Switches happen on the
         explicit Bootstrap data-bs-theme attribute, which index.html's
         pre-boot script already resolves from the in-app setting
         (localStorage 'bs-theme-mode'): light / dark / auto → the
         auto case reads matchMedia (prefers-color-scheme: dark) before
         paint and sets data-bs-theme to the actual mode. So the
         CSS below only ever sees light or dark, never 'auto'. */
      --mp-snippet-comment:    #696969;
      --mp-snippet-keyword:    #7928a1;
      --mp-snippet-string:     #008000;
      --mp-snippet-number:     #aa5d00;
      --mp-snippet-type:       #aa5d00;
      --mp-snippet-tag:        #d91e18;
      --mp-snippet-attribute:  #aa5d00;
      --mp-snippet-variable:   #d91e18;
      --mp-snippet-function:   #007faa;
      --mp-snippet-meta:       #aa5d00;
      --mp-snippet-regexp:     #d91e18;
      --mp-snippet-deletion-fg:#d91e18;
      --mp-snippet-deletion-bg:#fbe9e7;
      --mp-snippet-addition-fg:#008000;
      --mp-snippet-addition-bg:#e7fbe9;
    }

    /* a11y-dark palette — verbatim port of the
       ngx-highlight-themes/a11y-dark.scss file the master branch
       loaded for the Angular demo. */
    :host-context([data-bs-theme='dark']) {
      --mp-snippet-comment:    #d4d0ab;
      --mp-snippet-keyword:    #dcc6e0;
      --mp-snippet-string:     #abe338;
      --mp-snippet-number:     #f5ab35;
      --mp-snippet-type:       #f5ab35;
      --mp-snippet-tag:        #ffa07a;
      --mp-snippet-attribute:  #ffd700;
      --mp-snippet-variable:   #ffa07a;
      --mp-snippet-function:   #00e0e0;
      --mp-snippet-meta:       #f5ab35;
      --mp-snippet-regexp:     #ffa07a;
      --mp-snippet-deletion-fg:#ffa07a;
      --mp-snippet-deletion-bg:#4a1e1a;
      --mp-snippet-addition-fg:#abe338;
      --mp-snippet-addition-bg:#1e3a1a;
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

    /* hljs token → semantic colour mapping. Selector groups mirror the
       canonical a11y-light.css / a11y-dark.css from highlight.js verbatim
       (the same theme family the master branch's ngx-highlightjs setup
       loaded). Extra selectors not in the canonical themes (doctag,
       selector-pseudo, operator, property, template-tag, meta-keyword,
       meta-string) are folded into the nearest semantic group. */
    /* Comment (gray) */
    .hljs-comment, .hljs-quote, .hljs-doctag { color: var(--mp-snippet-comment); font-style: italic; }
    /* Red — variable, tag, name, selector-{id,class}, regexp, deletion */
    .hljs-variable, .hljs-template-variable, .hljs-template-tag,
    .hljs-tag, .hljs-name,
    .hljs-selector-id, .hljs-selector-class,
    .hljs-regexp { color: var(--mp-snippet-variable); }
    /* Orange — number, built_in, literal, type, params, meta, link */
    .hljs-number, .hljs-operator,
    .hljs-built_in, .hljs-builtin-name,
    .hljs-literal, .hljs-type, .hljs-params,
    .hljs-meta, .hljs-meta-keyword, .hljs-meta-string,
    .hljs-link { color: var(--mp-snippet-type); }
    /* Yellow — attribute (light-mode collapses to the orange swatch) */
    .hljs-attr, .hljs-attribute, .hljs-property { color: var(--mp-snippet-attribute); }
    /* Green — string, symbol, bullet, addition */
    .hljs-string, .hljs-symbol, .hljs-bullet { color: var(--mp-snippet-string); }
    /* Blue — title, section */
    .hljs-title, .hljs-title.function_, .hljs-section { color: var(--mp-snippet-function); }
    /* Purple — keyword, selector-tag */
    .hljs-keyword, .hljs-selector-tag, .hljs-selector-pseudo { color: var(--mp-snippet-keyword); }
    .hljs-function .hljs-keyword { color: var(--mp-snippet-keyword); }
    .hljs-subst { color: inherit; }
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
