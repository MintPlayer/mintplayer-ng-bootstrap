import { MP_DROPDOWN_MENU_DSD_CHROME } from './mp-dropdown-chrome.generated';

/**
 * Attribute-value-safe tag pattern: quoted values may contain `>`, so the
 * attribute chunk is tokenised as quoted strings or anything that is not a
 * quote/`>` — never a bare `[^>]*`. (Same machinery as the accordion injector.)
 */
const ATTRS = `(?:"[^"]*"|'[^']*'|[^"'>])*`;

const ATTR_TOKEN = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

function readAttribute(attrs: string, name: string): string | null {
  ATTR_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_TOKEN.exec(attrs))) {
    if (match[1].toLowerCase() === name) return match[2] ?? match[3] ?? match[4] ?? '';
  }
  return null;
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const TAG = new RegExp(`<(\\/?)([a-zA-Z][a-zA-Z0-9-]*)(${ATTRS})>`, 'g');

interface Insertion {
  /** Position of the tag's closing `>`. */
  at: number;
  text: string;
}

function hasClass(attrs: string, name: string): boolean {
  const cls = readAttribute(attrs, 'class');
  return cls !== null && cls.split(/\s+/).includes(name);
}

/**
 * Injects `<mp-dropdown-menu>`'s static Declarative Shadow DOM chrome into
 * server-rendered HTML so the menu renders (bordered panel + item/divider/header
 * `::slotted` styling) with JavaScript disabled — and stamps the item roles the
 * element would assign in `#syncItems`, which never runs server-side: without
 * them the chrome's menu/listbox has no owned menuitems/options in the no-JS
 * accessibility tree.
 *
 * Role placement mirrors the element: the item's first `<a>`/`<button>` carries
 * the role and the item becomes presentational; a control-less item carries the
 * role itself. `mode` is read from each menu's own open tag (menus nest — navbar
 * submenus — and each stamps its own subtree only). Authored roles are never
 * overwritten, which also makes the stamping idempotent.
 */
export function injectMpDropdownDsd(html: string): string {
  if (!html.includes('<mp-dropdown-menu')) {
    return html;
  }

  const insertions: Insertion[] = [];

  // Pass 1 — walk every tag once, tracking the stack of open menus (for mode)
  // and, within an item, whether its role-bearing control has been found.
  TAG.lastIndex = 0;
  interface OpenMenu { mode: 'menu' | 'listbox'; depth: number }
  interface OpenItem { menuDepth: number; depth: number; tagEnd: number; attrs: string; name: string; done: boolean }
  const menus: OpenMenu[] = [];
  const items: OpenItem[] = [];
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(html))) {
    const [full, slash, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    const isVoid = VOID_ELEMENTS.has(name) || /\/\s*$/.test(attrs);
    if (slash) {
      depth--;
      const item = items[items.length - 1];
      if (item && depth === item.depth) {
        // Item closed without an inner control: the item itself gets the role.
        if (!item.done && readAttribute(item.attrs, 'role') === null) {
          const mode = menus[menus.length - 1]?.mode ?? 'menu';
          insertions.push({ at: item.tagEnd - 1, text: ` role="${mode === 'listbox' ? 'option' : 'menuitem'}"` });
        }
        items.pop();
      }
      if (menus.length && depth === menus[menus.length - 1].depth) menus.pop();
      continue;
    }

    if (name === 'mp-dropdown-menu') {
      // While inside a menu but not inside one of ITS items… items host nested
      // menus, so the stack keeps each menu's own mode for its own items.
      menus.push({ mode: readAttribute(attrs, 'mode') === 'listbox' ? 'listbox' : 'menu', depth });
      if (!/^\s*<template\b[^>]*shadowrootmode/.test(html.slice(TAG.lastIndex, TAG.lastIndex + 120))) {
        insertions.push({ at: TAG.lastIndex, text: MP_DROPDOWN_MENU_DSD_CHROME });
      }
    } else if (menus.length && hasClass(attrs, 'dropdown-item')) {
      if (isVoid) {
        // A void item cannot contain a control; stamp it directly.
        if (readAttribute(attrs, 'role') === null) {
          const mode = menus[menus.length - 1].mode;
          insertions.push({ at: TAG.lastIndex - 1, text: ` role="${mode === 'listbox' ? 'option' : 'menuitem'}"` });
        }
      } else {
        items.push({ menuDepth: menus[menus.length - 1].depth, depth, tagEnd: TAG.lastIndex, attrs, name, done: false });
      }
    } else if ((name === 'a' || name === 'button') && items.length) {
      const item = items[items.length - 1];
      if (!item.done && menus.length && menus[menus.length - 1].depth === item.menuDepth) {
        item.done = true;
        if (readAttribute(item.attrs, 'role') === null && readAttribute(attrs, 'role') === null) {
          const mode = menus[menus.length - 1].mode;
          insertions.push({ at: item.tagEnd - 1, text: ' role="presentation"' });
          insertions.push({ at: TAG.lastIndex - 1, text: ` role="${mode === 'listbox' ? 'option' : 'menuitem'}"` });
        }
      }
    }

    if (!isVoid) depth++;
  }

  // Pass 2 — apply insertions back-to-front so positions stay valid.
  insertions.sort((a, b) => b.at - a.at);
  let out = html;
  for (const ins of insertions) {
    out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  }
  return out;
}
