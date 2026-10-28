import type { CodeLineAnnotation } from './code-line-annotation';
import { escapeHtml, normalizeSource, splitHighlightedLines } from './split-lines';

/**
 * The code snippet's view (PRD #437 D10): pure, so the server render and the
 * first client render agree.
 *
 * No-JS tier: 2-like, without DSD. The server renders the whole listing as
 * escaped plain text: readable, selectable and line-numbered, with live links
 * when `lineHref` is set. Highlighting is an upgrade after hydration (the
 * grammar is a lazy chunk), and the copy button is disabled until then
 * because it cannot work without script.
 */

export const CODE_SNIPPET_SCOPE = 'code-snippet';

export type CodeSnippetTheme = 'auto' | 'light' | 'dark';

/**
 * Every string the snippet renders or announces. Patterns substitute
 * `${language}` (the resolved grammar, `code` when unknown) and `${line}`.
 */
export interface CodeSnippetLabels {
  /** The copy button's visible text. */
  copyText: string;
  /** The copy button's accessible name. */
  copy: string;
  /** A line link's accessible name. */
  line: string;
  /** The code region's name when the `label` input is empty. */
  region: string;
  /** The toast after a copy. */
  copied: string;
  /** What a screen reader hears after a copy. */
  copiedAnnouncement: string;
  /** The region's description while line links exist. */
  keymapHint: string;
}

export const CODE_SNIPPET_LABELS: CodeSnippetLabels = {
  copyText: 'Copy ${language}',
  copy: 'Copy ${language} code to clipboard',
  line: 'Line ${line}',
  region: '${language} code sample',
  copied: 'Copied!',
  copiedAnnouncement: 'Copied to clipboard',
  keymapHint: 'Use the up and down arrow keys to move between line links, Home and End for the first and last line.',
};

export type CodeSnippetBag = Record<string, string | number | boolean | null>;

/** One rendered row. Absent cells are null, so their track stays empty. */
export interface CodeSnippetRow {
  number: number;
  row: CodeSnippetBag;
  /** The line number as a link (`lineHref` set) ... */
  link: CodeSnippetBag | null;
  /** The link's target, bound explicitly: bags refuse URL attributes. Empty without a link. */
  href: string;
  /** ... or as inert, hidden text (`lineNumbers` without `lineHref`). */
  gutter: CodeSnippetBag | null;
  mark: CodeSnippetBag | null;
  markText: string;
  secondary: CodeSnippetBag | null;
  secondaryText: string;
  text: CodeSnippetBag;
  /** Escaped source, or highlight.js markup built from it. Never consumer HTML. */
  html: string;
  description: CodeSnippetBag | null;
  descriptionText: string;
}

export interface CodeSnippetView {
  root: CodeSnippetBag;
  copy: CodeSnippetBag;
  copyText: string;
  pre: CodeSnippetBag;
  code: CodeSnippetBag;
  rows: CodeSnippetRow[];
  keymap: CodeSnippetBag | null;
  keymapText: string;
  toast: CodeSnippetBag;
  toastText: string;
  live: CodeSnippetBag;
  liveText: string;
}

export interface CodeSnippetOptions {
  id: string;
  code: string;
  theme: CodeSnippetTheme;
  wrap: boolean;
  lineNumbers: boolean;
  startLine: number;
  annotations: readonly CodeLineAnnotation[];
  activeLine: number | null;
  lineHref: ((line: number) => string) | null;
  /** The region's name; empty falls back to `labels.region`. */
  label: string;
  labels: CodeSnippetLabels;
  /** The resolved grammar, `code` until one is known. */
  language: string;
  /** Highlighted rows for exactly this source, or null to render it escaped. */
  highlighted: readonly string[] | null;
  /** The line link that holds the roving tab stop, or null for the default. */
  rovingLine: number | null;
  copied: boolean;
  hydrated: boolean;
}

/** The element id of a row: per instance, since the rows are in the light DOM. */
export const codeSnippetLineId = (id: string, line: number): string => `${id}-L${line}`;

/** Escaped plain-text rows: the server render and the first client render. */
export function plainLines(code: string): string[] {
  const source = normalizeSource(code ?? '');
  return source ? splitHighlightedLines(escapeHtml(source)) : [];
}

/**
 * Rows to render: one per source line, or more when an annotation names a
 * line past the end (a coverage report whose source could not be fetched
 * still renders its gutter).
 */
export function codeSnippetRowCount(lines: number, annotations: readonly CodeLineAnnotation[], startLine: number): number {
  const last = annotations.reduce((max, a) => Math.max(max, a.line), 0);
  return Math.max(lines, last === 0 ? 0 : last - startLine + 1);
}

/** Where Tab lands in the gutter: the last-focused link, else the active line, else the first. */
export const tabbableLine = (rovingLine: number | null, activeLine: number | null, startLine: number): number =>
  rovingLine ?? activeLine ?? startLine;

/**
 * A bare `#L7` resolves against `document.baseURI`, which `<base href="/">`
 * points at the app root: it would navigate away from the current route.
 * Resolved against the current URL instead, client side only; the server
 * render keeps the fragment, which hydration then corrects.
 */
function resolveLineHref(href: string, hydrated: boolean): string {
  if (!hydrated || !href.startsWith('#') || typeof location === 'undefined') return href;
  return `${location.pathname}${location.search}${href}`;
}

const fill = (pattern: string, key: string, value: string | number): string => pattern.split('${' + key + '}').join(String(value));

export function connectCodeSnippet(options: CodeSnippetOptions): CodeSnippetView {
  const { id, labels, language, startLine, lineHref, hydrated } = options;
  const scoped = (bag: CodeSnippetBag): CodeSnippetBag => ({ ...bag, 'data-mps': CODE_SNIPPET_SCOPE });
  const lines = options.highlighted ?? plainLines(options.code);
  const byLine = new Map(options.annotations.map((a) => [a.line, a]));
  const count = codeSnippetRowCount(lines.length, options.annotations, startLine);
  const tabbable = tabbableLine(options.rovingLine, options.activeLine, startLine);
  const keymapId = `${id}-keymap`;

  const rows = Array.from({ length: count }, (_, index): CodeSnippetRow => {
    const number = startLine + index;
    const annotation = byLine.get(number);
    const active = options.activeLine === number;
    const kind = annotation?.kind ? ` annotation-${annotation.kind}` : '';
    return {
      number,
      row: scoped({
        id: codeSnippetLineId(id, number),
        class: `line${active ? ' active' : ''}${annotation ? ' annotated' : ''}${kind}`,
        title: annotation?.description ?? null,
        'data-line': number,
      }),
      link:
        options.lineNumbers && lineHref
          ? scoped({
              class: 'line-number',
              'aria-label': fill(labels.line, 'line', number),
              tabindex: number === tabbable ? 0 : -1,
              'data-line': number,
            })
          : null,
      href: options.lineNumbers && lineHref ? resolveLineHref(lineHref(number), hydrated) : '',
      gutter: options.lineNumbers && !lineHref ? scoped({ class: 'line-number', 'aria-hidden': 'true' }) : null,
      mark: annotation?.label !== undefined ? scoped({ class: 'line-mark', 'aria-hidden': 'true' }) : null,
      markText: annotation?.label ?? '',
      secondary: annotation?.secondaryLabel !== undefined ? scoped({ class: 'line-mark secondary', 'aria-hidden': 'true' }) : null,
      secondaryText: annotation?.secondaryLabel ?? '',
      text: scoped({ class: 'line-text' }),
      html: lines[index] ?? '',
      description: annotation?.description ? scoped({ class: 'sr-only' }) : null,
      descriptionText: annotation?.description ?? '',
    };
  });

  const links = options.lineNumbers && !!lineHref;
  return {
    root: scoped({
      class: 'code-snippet',
      'data-theme': options.theme === 'auto' ? null : options.theme,
      'data-wrap': options.wrap ? '' : null,
    }),
    copy: scoped({
      type: 'button',
      class: 'copy',
      'aria-label': fill(labels.copy, 'language', language),
      disabled: !hydrated,
    }),
    copyText: fill(labels.copyText, 'language', language),
    pre: scoped({
      tabindex: 0,
      role: 'region',
      'aria-label': options.label || fill(labels.region, 'language', language),
      'aria-describedby': links ? keymapId : null,
    }),
    code: scoped({ class: 'hljs' }),
    rows,
    keymap: links ? scoped({ id: keymapId, class: 'sr-only' }) : null,
    keymapText: labels.keymapHint,
    toast: scoped({ class: `toast${options.copied ? ' visible' : ''}`, 'aria-hidden': options.copied ? 'false' : 'true' }),
    toastText: labels.copied,
    live: scoped({ class: 'sr-only', role: 'status', 'aria-live': 'polite' }),
    liveText: options.copied ? labels.copiedAnnouncement : '',
  };
}
