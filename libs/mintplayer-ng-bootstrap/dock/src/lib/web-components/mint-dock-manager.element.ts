import { DockLayoutNode, DockSplitNode, DockStackNode, DockLayoutSnapshot } from '../types/dock-layout';

const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      contain: layout paint size style;
      box-sizing: border-box;
      font-family: inherit;
      color: inherit;
    }

    .dock-root,
    .dock-split,
    .dock-split__child,
    .dock-stack,
    .dock-stack__content,
    .dock-stack__pane {
      box-sizing: border-box;
      min-width: 0;
      min-height: 0;
    }

    .dock-root {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .dock-split {
      display: flex;
      flex: 1 1 0;
      gap: 0.25rem;
    }

    .dock-split[data-direction="vertical"] {
      flex-direction: column;
    }

    .dock-split[data-direction="horizontal"] {
      flex-direction: row;
    }

    .dock-split__child {
      display: flex;
      flex: 1 1 0;
    }

    .dock-stack {
      display: flex;
      flex-direction: column;
      flex: 1 1 0;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 0.25rem;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(4px);
    }

    .dock-stack__header {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.25rem;
      background: rgba(0, 0, 0, 0.05);
      border-bottom: 1px solid rgba(0, 0, 0, 0.15);
    }

    .dock-tab {
      appearance: none;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      transition: background 160ms ease;
    }

    .dock-tab:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .dock-tab:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.8);
      outline-offset: 1px;
    }

    .dock-tab--active {
      background: rgba(59, 130, 246, 0.15);
    }

    .dock-stack__content {
      position: relative;
      flex: 1 1 auto;
      display: flex;
      overflow: hidden;
    }

    .dock-stack__pane {
      position: relative;
      flex: 1 1 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dock-stack__pane[hidden] {
      display: none !important;
    }

    ::slotted(*) {
      flex: 1 1 auto;
      display: block;
      min-width: 0;
      min-height: 0;
    }
  </style>
  <div class="dock-root"></div>
`;

export class MintDockManagerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['layout'];
  }

  private readonly rootEl: HTMLElement;
  private _layout: DockLayoutNode | null = null;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));
    const root = shadowRoot.querySelector<HTMLElement>('.dock-root');
    if (!root) {
      throw new Error('mint-dock-manager template is missing the root element.');
    }

    this.rootEl = root;
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'application');
    }
    this.render();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'layout') {
      this.layout = newValue ? this.parseLayout(newValue) : null;
    }
  }

  get layout(): DockLayoutNode | null {
    return this._layout ? this.cloneLayout(this._layout) : null;
  }

  set layout(value: DockLayoutNode | null) {
    this._layout = value ? this.cloneLayout(value) : null;
    this.render();
  }

  get snapshot(): DockLayoutSnapshot {
    return {
      root: this._layout ? this.cloneLayout(this._layout) : null,
    };
  }

  toJSON(): DockLayoutSnapshot {
    return this.snapshot;
  }

  private parseLayout(value: string): DockLayoutNode | null {
    try {
      const parsed = JSON.parse(value) as DockLayoutNode | null;
      if (!parsed) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('mint-dock-manager: failed to parse layout attribute', err);
      return null;
    }
  }

  private render(): void {
    this.rootEl.innerHTML = '';
    if (!this._layout) {
      return;
    }
    const fragment = this.renderNode(this._layout);
    this.rootEl.appendChild(fragment);
  }

  private renderNode(node: DockLayoutNode): HTMLElement {
    if (node.kind === 'split') {
      return this.renderSplit(node);
    }

    return this.renderStack(node);
  }

  private renderSplit(node: DockSplitNode): HTMLElement {
    const container = document.createElement('div');
    container.classList.add('dock-split');
    container.dataset.direction = node.direction;

    const sizes = Array.isArray(node.sizes) ? node.sizes : [];
    node.children.forEach((child, index) => {
      const childWrapper = document.createElement('div');
      childWrapper.classList.add('dock-split__child');

      const size = sizes[index];
      if (typeof size === 'number' && Number.isFinite(size)) {
        childWrapper.style.flex = `${Math.max(size, 0)} 1 0`;
      } else {
        childWrapper.style.flex = '1 1 0';
      }

      childWrapper.appendChild(this.renderNode(child));
      container.appendChild(childWrapper);
    });

    return container;
  }

  private renderStack(node: DockStackNode): HTMLElement {
    const stack = document.createElement('div');
    stack.classList.add('dock-stack');

    const header = document.createElement('div');
    header.classList.add('dock-stack__header');
    const content = document.createElement('div');
    content.classList.add('dock-stack__content');

    const panes = Array.from(new Set(node.panes));
    if (panes.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('dock-stack__pane');
      empty.textContent = 'No panes configured';
      content.appendChild(empty);
      stack.append(header, content);
      return stack;
    }

    const activePane = panes.includes(node.activePane ?? '')
      ? node.activePane!
      : panes[0];

    panes.forEach((paneName) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('dock-tab');
      button.dataset.pane = paneName;
      button.textContent = node.titles?.[paneName] ?? paneName;
      if (paneName === activePane) {
        button.classList.add('dock-tab--active');
      }
      button.addEventListener('click', () => {
        this.activatePane(stack, paneName);
        this.dispatchEvent(
          new CustomEvent('dock-pane-activated', {
            detail: { pane: paneName },
            bubbles: true,
            composed: true,
          }),
        );
      });
      header.appendChild(button);

      const paneHost = document.createElement('div');
      paneHost.classList.add('dock-stack__pane');
      paneHost.dataset.pane = paneName;
      if (paneName !== activePane) {
        paneHost.setAttribute('hidden', '');
      }

      const slotEl = document.createElement('slot');
      slotEl.name = paneName;
      paneHost.appendChild(slotEl);
      content.appendChild(paneHost);
    });

    stack.dataset.activePane = activePane;
    stack.append(header, content);
    return stack;
  }

  private activatePane(stack: HTMLElement, paneName: string): void {
    stack.dataset.activePane = paneName;

    const headerButtons = stack.querySelectorAll<HTMLButtonElement>('.dock-tab');
    headerButtons.forEach((button) => {
      button.classList.toggle('dock-tab--active', button.dataset.pane === paneName);
    });

    const panes = stack.querySelectorAll<HTMLElement>('.dock-stack__pane');
    panes.forEach((pane) => {
      if (pane.dataset.pane === paneName) {
        pane.removeAttribute('hidden');
      } else {
        pane.setAttribute('hidden', '');
      }
    });
  }

  private cloneLayout(layout: DockLayoutNode): DockLayoutNode;
  private cloneLayout(layout: DockLayoutNode | null): DockLayoutNode | null;
  private cloneLayout(layout: DockLayoutNode | null): DockLayoutNode | null {
    if (!layout) {
      return null;
    }

    return JSON.parse(JSON.stringify(layout)) as DockLayoutNode;
  }
}

const tagName = 'mint-dock-manager';

if (!customElements.get(tagName)) {
  customElements.define(tagName, MintDockManagerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mint-dock-manager': MintDockManagerElement;
  }
}
