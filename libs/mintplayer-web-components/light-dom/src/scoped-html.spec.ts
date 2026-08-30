import { html, render } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import { describe, expect, it } from 'vitest';

import { rewriteStatics, scopedHtml, scopedSvg, stampScope } from './scoped-html';

/** Build a real TemplateStringsArray without invoking lit. */
const tsa = (...parts: string[]): TemplateStringsArray => {
  const arr = parts.slice() as string[] & { raw: string[] };
  Object.defineProperty(arr, 'raw', { value: parts.slice() });
  return Object.freeze(arr) as unknown as TemplateStringsArray;
};

const joinRewritten = (parts: string[]): string =>
  Array.from(rewriteStatics(tsa(...parts), 'badge')).join('${…}');

describe('rewriteStatics — torture corpus', () => {
  it('stamps a simple element', () => {
    expect(joinRewritten(['<div class="x">hi</div>'])).toBe(
      '<div data-mps="badge" class="x">hi</div>',
    );
  });

  it('never stamps closing tags', () => {
    expect(joinRewritten(['<div><span></span></div>'])).toBe(
      '<div data-mps="badge"><span data-mps="badge"></span></div>',
    );
  });

  it('interpolation mid-attribute-list', () => {
    // html`<div class=${x} foo>` — statics: ['<div class=', ' foo>']
    expect(joinRewritten(['<div class=', ' foo></div>'])).toBe(
      '<div data-mps="badge" class=${…} foo></div>',
    );
  });

  it('quoted value spanning two interpolation gaps', () => {
    // html`<div title="${a} – ${b}">x</div>`
    expect(joinRewritten(['<div title="', ' – ', '">x</div>'])).toBe(
      '<div data-mps="badge" title="${…} – ${…}">x</div>',
    );
  });

  it('attribute values containing > and <', () => {
    expect(joinRewritten(['<div title="a > b < c"><i>x</i></div>'])).toBe(
      '<div data-mps="badge" title="a > b < c"><i data-mps="badge">x</i></div>',
    );
  });

  it('single-quoted values containing >', () => {
    expect(joinRewritten(["<div title='a > b'><i>x</i></div>"])).toBe(
      "<div data-mps=\"badge\" title='a > b'><i data-mps=\"badge\">x</i></div>",
    );
  });

  it('comments containing fake tags are untouched', () => {
    expect(joinRewritten(['<!-- <div class="x"> --><span>x</span>'])).toBe(
      '<!-- <div class="x"> --><span data-mps="badge">x</span>',
    );
  });

  it('comments containing a binding are untouched', () => {
    expect(joinRewritten(['<!-- ', ' <b>no</b> --><span>x</span>'])).toBe(
      '<!-- ${…} <b>no</b> --><span data-mps="badge">x</span>',
    );
  });

  it('raw text elements: style/textarea bodies are never markup', () => {
    expect(joinRewritten(['<style>.x>y{color:red}</style><b>x</b>'])).toBe(
      '<style data-mps="badge">.x>y{color:red}</style><b data-mps="badge">x</b>',
    );
    expect(joinRewritten(['<textarea>', '</textarea><b>x</b>'])).toBe(
      '<textarea data-mps="badge">${…}</textarea><b data-mps="badge">x</b>',
    );
  });

  it('raw text content containing a lookalike close tag of another element', () => {
    expect(joinRewritten(['<style>/* </div> */ .a{}</style><b>x</b>'])).toBe(
      '<style data-mps="badge">/* </div> */ .a{}</style><b data-mps="badge">x</b>',
    );
  });

  it('element-position directive: <div ${ref(r)}>', () => {
    expect(joinRewritten(['<div ', '>x</div>'])).toBe(
      '<div data-mps="badge" ${…}>x</div>',
    );
  });

  it('boolean/property/event bindings are just attribute names', () => {
    expect(joinRewritten(['<input ?disabled=', ' .value=', ' @input=', '>'])).toBe(
      '<input data-mps="badge" ?disabled=${…} .value=${…} @input=${…}>',
    );
  });

  it('self-closing and void elements', () => {
    expect(joinRewritten(['<img src="x.png"/><br><hr />'])).toBe(
      '<img data-mps="badge" src="x.png"/><br data-mps="badge"><hr data-mps="badge" />',
    );
  });

  it('unquoted attribute values', () => {
    expect(joinRewritten(['<div class=badge>x</div>'])).toBe(
      '<div data-mps="badge" class=badge>x</div>',
    );
  });

  it('binding directly after the tag name', () => {
    // html`<div${ref(r)}>` — static ends mid tag-name state
    expect(joinRewritten(['<div', '>x</div>'])).toBe(
      '<div data-mps="badge"${…}>x</div>',
    );
  });

  it('literal < in text is not a tag', () => {
    expect(joinRewritten(['<span>a < b</span>'])).toBe(
      '<span data-mps="badge">a < b</span>',
    );
  });

  it('bogus comments / processing instructions are skipped', () => {
    expect(joinRewritten(['<!doctype html><?xml?><b>x</b>'])).toBe(
      '<!doctype html><?xml?><b data-mps="badge">x</b>',
    );
  });
});

describe('scopedHtml — lit integration', () => {
  it('stamps rendered DOM, including svg', () => {
    const shtml = scopedHtml('badge');
    const ssvg = scopedSvg('badge');
    const host = document.createElement('div');
    render(
      shtml`<p class="a"><b>x</b></p><svg viewBox="0 0 1 1">${ssvg`<path d="M0 0"/>`}</svg>`,
      host,
    );
    const stamped = host.querySelectorAll('[data-mps=badge]');
    expect([...stamped].map((el) => el.tagName.toLowerCase())).toEqual([
      'p',
      'b',
      'svg',
      'path',
    ]);
  });

  it('identity stability: same call site reuses DOM across renders', () => {
    const shtml = scopedHtml('badge');
    const tpl = (v: string) => shtml`<p class="a">${v}</p>`;
    const host = document.createElement('div');
    render(tpl('one'), host);
    const first = host.querySelector('p');
    render(tpl('two'), host);
    expect(host.querySelector('p')).toBe(first);
    expect(host.querySelector('p')?.textContent).toBe('two');
  });

  it('rewritten statics are identical objects across calls', () => {
    const shtml = scopedHtml('badge');
    const tpl = (v: string) => shtml`<p>${v}</p>`;
    expect(tpl('a').strings).toBe(tpl('b').strings);
  });

  it('the original statics are not mutated', () => {
    const shtml = scopedHtml('badge');
    const make = (v: string) => {
      const result = html`<p>${v}</p>`;
      const scoped = shtml`<p>${v}</p>`;
      return { plain: result.strings, scoped: scoped.strings };
    };
    const { plain, scoped } = make('x');
    expect(plain[0]).toBe('<p>');
    expect(scoped[0]).toBe('<p data-mps="badge">');
    expect(scoped).not.toBe(plain);
  });

  it('nested composed templates each carry exactly their own scope', () => {
    const badgeHtml = scopedHtml('badge');
    const chipHtml = scopedHtml('chip');
    const host = document.createElement('div');
    render(badgeHtml`<div class="outer">${chipHtml`<span class="inner">x</span>`}</div>`, host);
    expect(host.querySelector('.outer')?.getAttribute('data-mps')).toBe('badge');
    expect(host.querySelector('.inner')?.getAttribute('data-mps')).toBe('chip');
  });

  it('a foreign plain-html template stays unstamped', () => {
    const shtml = scopedHtml('badge');
    const host = document.createElement('div');
    render(shtml`<div class="mine">${html`<span class="theirs">x</span>`}</div>`, host);
    expect(host.querySelector('.mine')?.hasAttribute('data-mps')).toBe(true);
    expect(host.querySelector('.theirs')?.hasAttribute('data-mps')).toBe(false);
  });

  it('directives still work on stamped elements', () => {
    const shtml = scopedHtml('badge');
    const r = createRef<HTMLDivElement>();
    const host = document.createElement('div');
    render(shtml`<div ${ref(r)} class="x"></div>`, host);
    expect(r.value).toBe(host.querySelector('.x'));
    expect(r.value?.getAttribute('data-mps')).toBe('badge');
  });

  it('rejects invalid scopes', () => {
    expect(() => scopedHtml('Bad')).toThrow(/invalid scope/);
  });
});

describe('stampScope', () => {
  it('stamps a subtree, skipping other components’ subtrees', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<span></span><section data-mps="chip"><i></i></section><em></em>';
    stampScope(root, 'badge');
    expect(root.getAttribute('data-mps')).toBe('badge');
    expect(root.querySelector('span')?.getAttribute('data-mps')).toBe('badge');
    expect(root.querySelector('em')?.getAttribute('data-mps')).toBe('badge');
    expect(root.querySelector('section')?.getAttribute('data-mps')).toBe('chip');
    expect(root.querySelector('i')?.hasAttribute('data-mps')).toBe(false);
  });
});
