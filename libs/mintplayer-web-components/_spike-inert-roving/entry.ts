/* Spike entry — bundled into the test page by esbuild so the spike exercises the
   REAL shipped primitives. A hand-written copy in the page would test a second
   implementation of our own rules and pass while the browser disagreed. */
import { inertRegions } from '../a11y/src/inert-regions';
import { RovingFocus } from '../a11y/src/roving-focus';

/* --- 0.4 main claim: `inert` propagates down the FLAT tree, so inerting a
       shadow-DOM wrapper also inerts the consumer's SLOTTED light DOM. --- */
class SlotWrapper extends HTMLElement {
  regions = inertRegions();
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<div id="wrapper"><slot></slot></div>`;
  }
  hide() {
    this.regions.setHidden([this.shadowRoot!.getElementById('wrapper')!]);
  }
  show() {
    this.regions.setHidden([]);
  }
}
customElements.define('mp-slot-wrapper', SlotWrapper);

/* --- roving focus over items that live in the shadow root --- */
class RovingList extends HTMLElement {
  roving: RovingFocus;
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>:host { display: block } button { display: block }</style>
      <button part="item">one</button>
      <button part="item" aria-disabled="true">two (disabled)</button>
      <button part="item">three</button>
      <button part="item">four</button>`;
    this.roving = new RovingFocus({
      items: () => Array.from(root.querySelectorAll('button')),
      orientation: 'both',
    });
    root.addEventListener('keydown', (e) => {
      if (this.roving.onKeydown(e as KeyboardEvent)) (e as KeyboardEvent).preventDefault();
    });
  }
  connectedCallback() {
    this.roving.sync();
  }
}
customElements.define('mp-roving-list', RovingList);

declare global {
  interface Window {
    spike: {
      hide(): void;
      show(): void;
      activeIndex(): number;
      deepActive(): string;
    };
  }
}

window.spike = {
  hide: () => (document.querySelector('mp-slot-wrapper') as SlotWrapper).hide(),
  show: () => (document.querySelector('mp-slot-wrapper') as SlotWrapper).show(),
  activeIndex: () => (document.querySelector('mp-roving-list') as RovingList).roving.index,
  /* Focus inside a shadow root reports as the host to document.activeElement, so
     descend shadow roots to find what is really focused. */
  deepActive: () => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el ? `${el.tagName.toLowerCase()}#${el.id}:${(el.textContent ?? '').trim()}` : 'none';
  },
};
