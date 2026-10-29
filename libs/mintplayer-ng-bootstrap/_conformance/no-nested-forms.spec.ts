import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * No template puts a <form> inside bs-form, whose own template IS a form.
 *
 * The HTML parser drops a nested form start tag, so the server-rendered DOM is
 * one level shallower than the template, and hydration walks the wrong nodes
 * (the stepper demo threw "hasAttribute is not a function"). Client rendering
 * builds nodes directly and hides the mistake, so it shows up only under SSR.
 * Put [formGroup] on a div inside bs-form instead.
 *
 * Read with node:fs, not import.meta.glob: the demo app is outside this lib's
 * Vite root, and Vite refuses to serve it.
 */

const WORKSPACE = resolve(import.meta.dirname, '../../..');
const ROOTS = ['libs/mintplayer-ng-bootstrap', 'apps/ng-bootstrap-demo/src'];

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });

const templates = ROOTS.flatMap((root) => htmlFiles(join(WORKSPACE, root))).map((path) => ({
  path: relative(WORKSPACE, path).replace(/\\/g, '/'),
  html: readFileSync(path, 'utf8'),
}));

/** The markup between each <bs-form …> and its closing tag (bs-form does not nest). */
const bsFormBodies = (html: string): string[] =>
  [...html.matchAll(/<bs-form\b[^>]*>([\s\S]*?)<\/bs-form>/g)].map((match) => match[1]);

describe('no <form> inside bs-form', () => {
  it('finds the templates', () => {
    expect(templates.length).toBeGreaterThan(50);
    expect(templates.some(({ html }) => html.includes('<bs-form'))).toBe(true);
  });

  it.each(templates.filter(({ html }) => html.includes('<bs-form')).map(({ path, html }) => [path, html]))('%s', (_path, html) => {
    expect(bsFormBodies(html).filter((body) => /<form\b/.test(body))).toEqual([]);
  });
});
