import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import type { CodeLineAnnotation } from './code-line-annotation';
import {
  CODE_SNIPPET_LABELS,
  codeSnippetRowCount,
  connectCodeSnippet,
  plainLines,
  type CodeSnippetLabels,
  type CodeSnippetTheme,
  type CodeSnippetView,
} from './code-snippet';
import { highlight } from './highlighter';
import { normalizeSource, splitHighlightedLines } from './split-lines';

/**
 * The code snippet's core (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `code-snippet.component.ts` is its manifest and
 * `templates/code-snippet.view.vue` its markup.
 *
 * Highlighting runs after attach, so the server and the first client render
 * show the same escaped text; the highlighted rows replace it in place when
 * the grammar's chunk lands, and stay plain if it never does.
 */

export interface CodeSnippetInputs {
  code: string;
  /** A highlight.js language id or alias; empty auto-detects. */
  language: string;
  /** `auto` follows the page's colour scheme; `light` / `dark` pin the palette. */
  theme: CodeSnippetTheme;
  wrap: boolean;
  lineNumbers: boolean;
  /** The number of the first line, for an excerpt. */
  startLine: number;
  /** Sparse per-line markers. */
  annotations: readonly CodeLineAnnotation[] | null;
  /** Drawn as current: an outline over any annotation. */
  activeLine: number | null;
  /** Turns each line number into a real link (with `lineNumbers`). */
  lineHref: ((line: number) => string) | null;
  /** The code region's name; empty derives one from the language. */
  label: string;
  /** Overrides for the built-in English strings. */
  labels: Partial<CodeSnippetLabels> | null;
}

export interface CodeSnippetState {
  /** Highlighted rows, with the source and language they were built from. */
  highlighted: { source: string; language: string; lines: string[] } | null;
  /** The resolved grammar, `code` while none is known. */
  language: string;
  rovingLine: number | null;
  copied: boolean;
}

/**
 * A line link was activated with a plain primary click. `preventDefault()`
 * keeps the link from navigating, for a consumer that moves the active line
 * itself; the href stays, so middle-click and copy-link still work.
 */
export interface CodeLineActivation {
  line: number;
  preventDefault(): void;
}

export interface CodeSnippetEvents {
  /** The resolved grammar changed (`code` when the source could not be highlighted). */
  languageDetected: string;
  lineActivate: CodeLineActivation;
}

export interface CodeSnippetMethods {
  /** Scroll a line into view. Re-requesting the current line scrolls again. */
  scrollToLine(line: number): void;
  /** Settles once the in-flight highlight has been applied. */
  whenHighlighted(): Promise<void>;
}

export const CODE_SNIPPET_TOAST_MS = 3000;

type Api = CoreApi<CodeSnippetInputs, CodeSnippetState, CodeSnippetEvents>;

interface Runtime {
  token: number;
  pending: Promise<void>;
  timer: ReturnType<typeof setTimeout> | undefined;
}

const runtimes = new WeakMap<HTMLElement, Runtime>();
const runtimeOf = (host: HTMLElement): Runtime => {
  let runtime = runtimes.get(host);
  if (!runtime) runtimes.set(host, (runtime = { token: 0, pending: Promise.resolve(), timer: undefined }));
  return runtime;
};

const labelsOf = (inputs: Readonly<CodeSnippetInputs>): CodeSnippetLabels => ({ ...CODE_SNIPPET_LABELS, ...inputs.labels });

function setLanguage(api: Api, language: string): void {
  if (language === api.state().language) return;
  api.setState({ language });
  api.emit('languageDetected', language);
}

/** Highlights the current source; only the newest request may write. */
function runHighlight(api: Api): void {
  const runtime = runtimeOf(api.host);
  const source = normalizeSource(api.inputs().code ?? '');
  const language = api.inputs().language ?? '';
  const token = ++runtime.token;
  if (!source) {
    api.setState({ highlighted: null });
    setLanguage(api, 'code');
    runtime.pending = Promise.resolve();
    return;
  }
  runtime.pending = highlight(source, language).then(({ value, language: resolved, load }) => {
    if (token !== runtime.token) return;
    if (load === 'unknown-language') {
      console.warn(`[code-snippet] unknown language "${language}": rendering plain text. Register it with registerLanguage() if it is outside the bundled set.`);
    } else if (load === 'load-failed') {
      console.warn(`[code-snippet] failed to load the grammar for "${language || 'auto'}".`);
    }
    api.setState({ highlighted: value ? { source, language, lines: splitHighlightedLines(value) } : null });
    setLanguage(api, resolved ?? 'code');
  });
}

async function copy(api: Api): Promise<void> {
  const runtime = runtimeOf(api.host);
  try {
    await navigator.clipboard.writeText(api.inputs().code ?? '');
  } catch (err) {
    // No clipboard (an insecure context): no toast, so the user sees it did not work.
    console.warn('[code-snippet] clipboard write failed', err);
    return;
  }
  clearTimeout(runtime.timer);
  api.setState({ copied: true });
  runtime.timer = setTimeout(() => api.setState({ copied: false }), CODE_SNIPPET_TOAST_MS);
}

const lineOf = (el: Element): number => Number(el.getAttribute('data-line'));

function onClick(api: Api, event: MouseEvent): void {
  const target = event.target as Element;
  if (target.closest?.('button.copy')) {
    void copy(api);
    return;
  }
  const link = target.closest?.('a.line-number');
  if (!link || !api.host.contains(link)) return;
  // A modified or non-primary click opens the link elsewhere; it never activates the line here.
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  let prevented = false;
  api.emit('lineActivate', { line: lineOf(link), preventDefault: () => (prevented = true) });
  if (prevented) event.preventDefault();
}

/** Roving focus over the line links: arrows, Home and End, by line number. */
function onKeydown(api: Api, event: KeyboardEvent): void {
  const link = (event.target as Element).closest?.('a.line-number');
  if (!link || !api.host.contains(link)) return;
  const { code, annotations, startLine } = api.inputs();
  const lines = api.state().highlighted?.lines.length ?? plainLines(code).length;
  const first = startLine;
  const last = startLine + codeSnippetRowCount(lines, annotations ?? [], startLine) - 1;
  const current = lineOf(link);
  const next =
    event.key === 'ArrowDown' ? Math.min(current + 1, last)
    : event.key === 'ArrowUp' ? Math.max(current - 1, first)
    : event.key === 'Home' ? first
    : event.key === 'End' ? last
    : null;
  if (next === null) return;
  // The arrows would otherwise scroll the region out from under the focus.
  event.preventDefault();
  if (next === current) return;
  api.setState({ rovingLine: next });
  // By stable line number, never DOM position. Every link is focusable
  // (tabindex -1), so this need not wait for the tab stop to re-render.
  api.host.querySelector<HTMLElement>(`a.line-number[data-line="${next}"]`)?.focus();
}

export const codeSnippetCore = defineCore<
  CodeSnippetInputs,
  CodeSnippetState,
  { view: CodeSnippetView },
  CodeSnippetEvents,
  undefined,
  undefined,
  CodeSnippetMethods
>({
  state: () => ({ highlighted: null, language: 'code', rovingLine: null, copied: false }),
  view: ({ inputs, state, id, hydrated }) => {
    const { highlighted } = state;
    const current = highlighted && highlighted.source === normalizeSource(inputs.code ?? '') && highlighted.language === (inputs.language ?? '');
    return {
      view: connectCodeSnippet({
        id,
        code: inputs.code ?? '',
        theme: inputs.theme ?? 'auto',
        wrap: !!inputs.wrap,
        lineNumbers: !!inputs.lineNumbers,
        startLine: inputs.startLine ?? 1,
        annotations: inputs.annotations ?? [],
        activeLine: inputs.activeLine ?? null,
        lineHref: inputs.lineHref ?? null,
        label: inputs.label ?? '',
        labels: labelsOf(inputs),
        language: state.language,
        highlighted: current ? highlighted.lines : null,
        rovingLine: state.rovingLine,
        copied: state.copied,
        hydrated,
      }),
    };
  },
  attach: (api) => {
    const click = (event: MouseEvent) => onClick(api, event);
    const keydown = (event: KeyboardEvent) => onKeydown(api, event);
    api.host.addEventListener('click', click);
    api.host.addEventListener('keydown', keydown);
    runHighlight(api);
    return () => {
      api.host.removeEventListener('click', click);
      api.host.removeEventListener('keydown', keydown);
      const runtime = runtimeOf(api.host);
      clearTimeout(runtime.timer);
      // A highlight resolving after detach must not write.
      runtime.token++;
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.code !== prev.code || inputs.language !== prev.language) runHighlight(api);
  },
  methods: {
    scrollToLine: (api, line) => {
      api.host.querySelector(`.line[data-line="${line}"]`)?.scrollIntoView({ block: 'center', behavior: 'auto' });
    },
    whenHighlighted: (api) => runtimeOf(api.host).pending,
  },
});
