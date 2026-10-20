import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Machine } from '@mintplayer/ui-core/store';

/**
 * Bridge a `@mintplayer/ui-core` machine into a Lit element: every committed
 * snapshot requests one host update (Lit coalesces per microtask), the
 * subscription follows the host's connected state, and the machine is
 * destroyed with the host unless `ownsMachine` is false.
 *
 * The element reads `controller.state` in `render()`; it is always the
 * machine's current snapshot (spike S1, `machine-controller.spec.ts`).
 */
export class MachineController<M extends Machine<S>, S extends object> implements ReactiveController {
  #unsubscribe: (() => void) | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & { isConnected: boolean },
    readonly machine: M,
    private readonly ownsMachine = true,
  ) {
    host.addController(this);
  }

  get state(): S {
    return this.machine.snapshot;
  }

  hostConnected(): void {
    this.#unsubscribe ??= this.machine.subscribe(() => this.host.requestUpdate());
    // State may have moved while disconnected; render it.
    this.host.requestUpdate();
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  /** Called by the host when it is torn down for good (not merely moved in the DOM). */
  dispose(): void {
    this.hostDisconnected();
    if (this.ownsMachine) this.machine.destroy();
  }
}
