import { connect, TileManagerMachine, type AttrBag, type StyleBag, type TileManagerInputPatch } from '../tile-manager';

/**
 * The four-front DOM contract of the tile manager (#440). Each front (Lit, Angular, React, Vue)
 * renders its own template, so nothing stops one of them drifting from the others. This pins every
 * front to the same thing: the bags `connect()` returns for a reference machine fed the same inputs
 * and the same measured width. A front's spec renders, measures, then asserts
 * `tileManagerDomMismatches(root, inputs, width)` is empty.
 *
 * Compared: every attribute and style the core writes, on the board, grid, tiles, headers, bodies
 * and grips, the description and live-region texts, tile order and grip count. Not compared: what a
 * front adds of its own (class names, framework markers, slot wiring), which is not the contract.
 * The root id is read from the rendered board, since each framework mints its own.
 */
export function tileManagerDomMismatches(root: ParentNode, inputs: TileManagerInputPatch, width: number): string[] {
  const board = root.querySelector<HTMLElement>('[role="region"][data-mps="tile-manager"]');
  if (!board?.id) return ['no board region with an id'];

  const reference = new TileManagerMachine();
  reference.setInputs(inputs);
  reference.measure(width);
  const api = connect(reference, board.id);

  const out: string[] = [];
  // jsdom has no CSS.escape; ids and tile ids only need their quotes escaped inside [attr="…"].
  const quote = (value: string) => value.replace(/["\\]/g, '\\$&');
  const byId = (id: string) => root.querySelector<HTMLElement>(`[id="${quote(id)}"]`);
  const attrs = (where: string, el: Element | null, bag: AttrBag) => {
    if (!el) return void out.push(`${where}: missing`);
    for (const [name, value] of Object.entries(bag)) {
      const actual = el.getAttribute(name);
      const expected = value === true ? '' : value === false || value === null ? null : value;
      if (actual !== expected) out.push(`${where} [${name}]: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
    }
  };
  const style = (where: string, el: HTMLElement | null, bag: StyleBag) => {
    if (!el) return;
    for (const [name, value] of Object.entries(bag)) {
      const actual = el.style.getPropertyValue(name).trim() || null;
      if (actual !== value) out.push(`${where} style ${name}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(value)}`);
    }
  };

  attrs('board', board, api.board.attrs);
  style('board', board, api.board.style);

  const tiles = [...board.querySelectorAll<HTMLElement>('[data-tile-id]')];
  const order = tiles.map((t) => t.dataset['tileId']).join(',');
  const expectedOrder = api.tiles.map((t) => t.id).join(',');
  if (order !== expectedOrder) out.push(`tile order: ${order} ≠ ${expectedOrder}`);

  const grid = tiles[0]?.parentElement ?? null;
  attrs('grid', grid, api.grid.attrs);
  style('grid', grid, api.grid.style);

  for (const view of api.tiles) {
    const el = board.querySelector<HTMLElement>(`[data-tile-id="${quote(view.id)}"]`);
    attrs(`tile ${view.id}`, el, view.attrs);
    style(`tile ${view.id}`, el, view.style);
    attrs(`tile ${view.id} header`, el?.querySelector('[data-part="header"]') ?? null, view.header);
    attrs(`tile ${view.id} body`, el?.querySelector('[data-part="body"]') ?? null, view.content);
    const grips = el ? el.querySelectorAll('[data-part="side"], [data-part="bottom"], [data-part="corner"]') : [];
    if (grips.length !== view.grips.length) out.push(`tile ${view.id}: ${grips.length} grips ≠ ${view.grips.length}`);
    for (const grip of view.grips) attrs(`tile ${view.id} grip ${grip.handle}`, el?.querySelector(`[data-part="${grip.handle}"]`) ?? null, grip.attrs);
  }

  for (const node of api.descriptions) {
    const el = byId(String(node.attrs['id']));
    attrs(`description ${node.key}`, el, node.attrs);
    if (el && el.textContent?.trim() !== node.text) out.push(`description ${node.key} text: ${JSON.stringify(el.textContent?.trim())} ≠ ${JSON.stringify(node.text)}`);
  }

  const live = board.querySelector<HTMLElement>('[role="status"]');
  attrs('live', live, api.live.attrs);
  if (live && (live.textContent?.trim() ?? '') !== api.live.text) out.push(`live text: ${JSON.stringify(live.textContent?.trim())} ≠ ${JSON.stringify(api.live.text)}`);

  return out;
}
