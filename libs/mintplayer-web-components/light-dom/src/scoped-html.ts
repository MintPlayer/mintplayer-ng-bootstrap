import { html as litHtml, svg as litSvg, type TemplateResult } from 'lit';

/**
 * Template-side half of the light-tier emulated style encapsulation
 * (docs/prd/wc-style-encapsulation.md §L2).
 *
 * `scopedHtml('badge')` returns a drop-in replacement for lit's `html` that
 * stamps ` data-mps="badge"` onto every element the template opens — the
 * attribute the rescoped light stylesheet selects on. The rewrite happens on
 * the template literal's STATIC strings, exactly once per call site:
 *
 *  - Lit forbids bindings in tag-name position, so the insertion point (end
 *    of the tag name) can never span an interpolation — only tokenizer state
 *    has to survive the gaps.
 *  - Lit keys template preparation and re-render DOM reuse on
 *    `TemplateStringsArray` identity, so the rewritten array must be NEW
 *    (never mutate the frozen original) but STABLE per call site — the
 *    WeakMap below guarantees both. `@lit-labs/ssr` reads the same statics,
 *    so SSR output carries the attributes with zero extra work, and
 *    hydration matches because the rewrite is deterministic.
 *
 * Blind spots, by design (Angular semantics — someone else's template is not
 * yours to stamp): templates composed in from plain `html` calls,
 * `unsafeHTML(...)` content, and imperatively created DOM. For the latter
 * two use `stampScope`.
 */

const SCOPE_ATTRIBUTE = 'data-mps';

/** Elements whose content is raw text — never markup — until the matching
 *  close tag. Tags inside them must not be stamped. */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

// Tokenizer states. The state (plus the small companions below it) persists
// across the template's static-string boundaries, i.e. across interpolations.
// (A const object, not a `const enum` — esbuild/isolatedModules can't inline
// const enums.)
const State = {
  Text: 0,
  /** Saw `<`; the next char decides tag / closing / comment / bogus. */
  TagOpen: 1,
  /** Saw `<!`. */
  MarkupDecl: 2,
  /** Saw `<!-`. */
  CommentDash: 3,
  /** Inside a tag name (insertion happens when this state exits). */
  TagName: 4,
  /** Inside an open tag's attribute area. */
  InTag: 5,
  /** Saw `=` after an attribute name; the value follows (or is a binding). */
  AfterEq: 6,
  ValueDq: 7,
  ValueSq: 8,
  ValueUnq: 9,
  /** Inside `</...>`. */
  Closing: 10,
  /** Inside `<!-- ... -->`. */
  Comment: 11,
  /** Inside `<!...>` / `<?...>`. */
  Bogus: 12,
  /** Inside a raw-text element's content. */
  RawText: 13,
} as const;
type State = (typeof State)[keyof typeof State];

interface Tokenizer {
  state: State;
  /** Tag name being read (TagName) or last opened (InTag). */
  tagName: string;
  /** Progress matching `-->` while in Comment (count of trailing `-`). */
  commentDashes: number;
  /** Progress matching `</tagName` while in RawText. */
  rawMatch: number;
  /** Saw `/` in InTag — a following `>` self-closes (no raw-text content). */
  sawSlash: boolean;
}

const isNameChar = (c: string) => /[a-zA-Z0-9-]/.test(c);
const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';

/**
 * Run the tokenizer over one static string, returning the rewritten string.
 * Mutates `t` so state carries into the next static.
 */
function rewriteStatic(input: string, t: Tokenizer, attrText: string): string {
  let out = '';
  let i = 0;
  const n = input.length;

  const closeTag = (): void => {
    if (!t.sawSlash && RAW_TEXT_ELEMENTS.has(t.tagName)) {
      t.state = State.RawText;
      t.rawMatch = 0;
    } else {
      t.state = State.Text;
    }
    t.sawSlash = false;
  };

  while (i < n) {
    const c = input[i];
    switch (t.state) {
      case State.Text:
        if (c === '<') t.state = State.TagOpen;
        out += c;
        i++;
        break;

      case State.TagOpen:
        if (/[a-zA-Z]/.test(c)) {
          t.state = State.TagName;
          t.tagName = c.toLowerCase();
        } else if (c === '/') {
          t.state = State.Closing;
        } else if (c === '!') {
          t.state = State.MarkupDecl;
        } else if (c === '?') {
          t.state = State.Bogus;
        } else {
          t.state = State.Text; // literal `<`
        }
        out += c;
        i++;
        break;

      case State.MarkupDecl:
        t.state = c === '-' ? State.CommentDash : State.Bogus;
        out += c;
        i++;
        break;

      case State.CommentDash:
        if (c === '-') {
          t.state = State.Comment;
          t.commentDashes = 0;
        } else {
          t.state = State.Bogus; // `<!-x` — bogus comment
        }
        out += c;
        i++;
        break;

      case State.TagName:
        if (isNameChar(c)) {
          t.tagName += c.toLowerCase();
          out += c;
          i++;
        } else {
          // Tag name complete — this is THE insertion point.
          out += attrText;
          t.state = State.InTag;
          t.sawSlash = false;
          // reprocess c in InTag
        }
        break;

      case State.InTag:
        if (c === '>') {
          out += c;
          i++;
          closeTag();
        } else if (c === '/') {
          t.sawSlash = true;
          out += c;
          i++;
        } else if (c === '=') {
          t.sawSlash = false;
          t.state = State.AfterEq;
          out += c;
          i++;
        } else if (c === '"') {
          // Quote without `=` — malformed, but skip to the closing quote so a
          // `>` inside it can't be mistaken for the tag end.
          t.sawSlash = false;
          t.state = State.ValueDq;
          out += c;
          i++;
        } else if (c === "'") {
          t.sawSlash = false;
          t.state = State.ValueSq;
          out += c;
          i++;
        } else {
          if (!isSpace(c)) t.sawSlash = false;
          out += c;
          i++;
        }
        break;

      case State.AfterEq:
        if (isSpace(c)) {
          out += c;
          i++;
        } else if (c === '"') {
          t.state = State.ValueDq;
          out += c;
          i++;
        } else if (c === "'") {
          t.state = State.ValueSq;
          out += c;
          i++;
        } else if (c === '>') {
          // `attr=>` — empty value, tag ends.
          out += c;
          i++;
          closeTag();
        } else {
          t.state = State.ValueUnq;
          out += c;
          i++;
        }
        break;

      case State.ValueDq:
        if (c === '"') t.state = State.InTag;
        out += c;
        i++;
        break;

      case State.ValueSq:
        if (c === "'") t.state = State.InTag;
        out += c;
        i++;
        break;

      case State.ValueUnq:
        if (isSpace(c)) {
          t.state = State.InTag;
          out += c;
          i++;
        } else if (c === '>') {
          out += c;
          i++;
          closeTag();
        } else {
          out += c;
          i++;
        }
        break;

      case State.Closing:
      case State.Bogus:
        if (c === '>') t.state = State.Text;
        out += c;
        i++;
        break;

      case State.Comment:
        if (c === '-') {
          t.commentDashes++;
        } else if (c === '>' && t.commentDashes >= 2) {
          t.state = State.Text;
        } else {
          t.commentDashes = 0;
        }
        out += c;
        i++;
        break;

      case State.RawText: {
        // Match `</tagName` case-insensitively, char by char, across statics.
        const needle = '</' + t.tagName;
        if (c.toLowerCase() === needle[t.rawMatch]) {
          t.rawMatch++;
          if (t.rawMatch === needle.length) {
            t.state = State.Closing;
            t.rawMatch = 0;
          }
        } else {
          // Mismatch — restart, allowing the current char to begin a match.
          t.rawMatch = c === '<' ? 1 : 0;
        }
        out += c;
        i++;
        break;
      }
    }
  }

  // Static ended mid-tag-name: lit still treats the following binding as
  // attribute-position, so complete the insertion here.
  if (t.state === State.TagName) {
    out += attrText;
    t.state = State.InTag;
    t.sawSlash = false;
  }

  return out;
}

/** End-of-static adjustment: a binding standing where a value would start is
 *  the whole value (lit contract), so resume as if the value was consumed. */
function endOfStatic(t: Tokenizer): void {
  if (t.state === State.AfterEq) t.state = State.ValueUnq;
}

/** Start-of-next-static adjustment: an unquoted-value binding ends at the
 *  boundary; the next static continues in attribute position. */
function startOfStatic(t: Tokenizer): void {
  if (t.state === State.ValueUnq) t.state = State.InTag;
}

/**
 * Rewrite a template's static strings, stamping the scope attribute after
 * every element tag name. Pure and deterministic; exported for the codegen
 * (static `.element.html` templates route through the same rewriter) and for
 * tests.
 */
export function rewriteStatics(
  strings: TemplateStringsArray,
  scope: string,
): TemplateStringsArray {
  const attrText = ` ${SCOPE_ATTRIBUTE}="${scope}"`;

  const run = (parts: readonly string[]): string[] => {
    const t: Tokenizer = {
      state: State.Text,
      tagName: '',
      commentDashes: 0,
      rawMatch: 0,
      sawSlash: false,
    };
    const out: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) startOfStatic(t);
      out.push(rewriteStatic(parts[i], t, attrText));
      if (i < parts.length - 1) endOfStatic(t);
    }
    return out;
  };

  // Cooked and raw are rewritten independently so each stays self-consistent
  // (escape sequences can make them differ); lit reads whichever it prefers.
  const cooked = run(strings);
  const raw = run(strings.raw);

  const result = cooked as string[] & { raw: readonly string[] };
  Object.defineProperty(result, 'raw', { value: Object.freeze(raw) });
  return Object.freeze(result) as unknown as TemplateStringsArray;
}

let verifyRewrites = true;

/** Disable the once-per-template structural verification (see below) — an
 *  escape hatch for a false positive; the rewrite itself still runs. */
export function configureScopedHtml(options: { verify?: boolean }): void {
  if (options.verify !== undefined) verifyRewrites = options.verify;
}

/**
 * Structural safety net, once per template literal: parse original and
 * rewritten statics (interpolations replaced by a benign token) and require
 * the same element count. Catches a tokenizer bug that breaks markup
 * structure; insertion into a text position or attribute value would show up
 * here as a count mismatch or an attribute-less parse.
 */
function verifyRewrite(
  original: TemplateStringsArray,
  rewritten: TemplateStringsArray,
  scope: string,
): void {
  if (typeof document === 'undefined') return;
  try {
    const count = (parts: readonly string[]): number => {
      const tpl = document.createElement('template');
      tpl.innerHTML = parts.join('x');
      return tpl.content.querySelectorAll('*').length;
    };
    const before = count(original);
    const after = count(rewritten);
    if (before !== after) {
      throw new Error(
        `scopedHtml('${scope}'): rewrite changed the template's structure ` +
          `(${before} -> ${after} elements). Template statics: ` +
          JSON.stringify(Array.from(original)),
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('scopedHtml(')) throw err;
    // Parsing itself failed (exotic environment) — skip the check.
  }
}

function validateScope(scope: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(scope)) {
    throw new Error(
      `scopedHtml: invalid scope ${JSON.stringify(scope)} — expected a ` +
        `lowercase identifier (the element name without its mp- prefix)`,
    );
  }
}

type TemplateTag = (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult;

function makeScopedTag(scope: string, delegate: TemplateTag): TemplateTag {
  validateScope(scope);
  const cache = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
  return (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => {
    let rewritten = cache.get(strings);
    if (!rewritten) {
      rewritten = rewriteStatics(strings, scope);
      if (verifyRewrites) verifyRewrite(strings, rewritten, scope);
      cache.set(strings, rewritten);
    }
    return delegate(rewritten, ...values);
  };
}

/** A scope-stamping replacement for lit's `html`. One factory call per
 *  component module; use the result for every template the component owns. */
export function scopedHtml(scope: string): TemplateTag {
  return makeScopedTag(scope, litHtml as TemplateTag);
}

/** The `svg` twin (data-* attributes are valid on SVG elements). */
export function scopedSvg(scope: string): TemplateTag {
  return makeScopedTag(scope, litSvg as TemplateTag);
}

/**
 * Imperatively stamp a DOM subtree with a scope — for DOM the rewriter can't
 * see (`unsafeHTML` output, `document.createElement`, an overlay panel built
 * by hand). Skips subtrees that already belong to another scope.
 */
export function stampScope(root: Element, scope: string): void {
  validateScope(scope);
  const existing = root.getAttribute(SCOPE_ATTRIBUTE);
  if (existing !== null && existing !== scope) return;
  root.setAttribute(SCOPE_ATTRIBUTE, scope);
  for (const child of Array.from(root.children)) {
    stampScope(child, scope);
  }
}
