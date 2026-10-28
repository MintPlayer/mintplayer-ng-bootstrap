import { nothing, render } from 'lit';
import { Directive, directive, PartType, type PartInfo } from 'lit/directive.js';

/**
 * Render a template into another element, the compiled form of a view's
 * `<teleport :to>`. The twin of React's `createPortal`, Vue's `<Teleport>` and
 * Angular's `[mpTeleport]`. Nothing renders where the directive sits, and
 * nothing at all while `to` is null (the server's case). A core hands a target
 * whose identity never changes (the dock's per-pane hosts), so the content's
 * state survives wherever the core moves that target.
 *
 *     html`${teleport(view.paneHosts[pane], html`...`)}`
 */
class TeleportDirective extends Directive {
  #to: Element | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) throw new Error('teleport() must be used in child position');
  }

  render(_to: Element | null | undefined, _content: unknown): typeof nothing {
    return nothing;
  }

  override update(_part: unknown, [to, content]: [Element | null | undefined, unknown]): typeof nothing {
    const target = to ?? null;
    if (this.#to && this.#to !== target) render(nothing, this.#to as HTMLElement);
    this.#to = target;
    if (target) render(content, target as HTMLElement);
    return nothing;
  }
}

export const teleport = directive(TeleportDirective);
