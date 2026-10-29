import { Machine } from '@mintplayer/ui-core/store';

export type Politeness = 'polite' | 'assertive';

export interface AnnouncerOptions {
  /** "polite" waits for an SR-idle moment; "assertive" interrupts. Default: "polite". */
  politeness?: Politeness;
  /** ms after which the region is blanked, so the same message can re-announce later. Default: 1500. */
  clearAfterMs?: number;
  /**
   * Emit NO role on the region (aria-live alone makes it a live region). Required
   * inside a role with a strict children contract: an owned role=status inside
   * role=tree is invalid (axe aria-required-children).
   */
  omitRole?: boolean;
}

export interface AnnouncerState {
  /** What the live region says right now; '' when silent. */
  readonly text: string;
}

/** The attribute bag for the live-region node. Fronts render it with the baseline's `.visually-hidden`. */
export type AnnouncerAttrs = Record<string, string | null>;

/**
 * A live announcement as state. The front renders one visually-hidden node
 * with {@link Announcer.attrs} and `snapshot.text` as its content; there is no
 * DOM here, so every front (and the server render, where it is always empty)
 * agrees. Replaces the Lit-only `LiveAnnouncerController`.
 *
 * The same string twice in a row would be a no-op for screen readers that diff
 * the text, so a repeat blanks the region first and re-sets it on the next
 * macrotask, after every front has rendered the blank.
 */
export class Announcer extends Machine<AnnouncerState> {
  readonly #politeness: Politeness;
  readonly #clearAfterMs: number;
  readonly #omitRole: boolean;
  #clearTimer: ReturnType<typeof setTimeout> | undefined;
  #repeatTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: AnnouncerOptions = {}) {
    super({ text: '' });
    this.#politeness = options.politeness ?? 'polite';
    this.#clearAfterMs = options.clearAfterMs ?? 1500;
    this.#omitRole = options.omitRole ?? false;
  }

  /** Attributes for the live-region node. Constant for the announcer's lifetime. */
  get attrs(): AnnouncerAttrs {
    const role = this.#omitRole ? null : this.#politeness === 'assertive' ? 'alert' : 'status';
    return { role, 'aria-live': this.#politeness, 'aria-atomic': 'true' };
  }

  announce(message: string): void {
    if (!message) return;
    clearTimeout(this.#repeatTimer);
    if (this.snapshot.text !== message) {
      this.#say(message);
      return;
    }
    this.update({ text: '' });
    this.#repeatTimer = setTimeout(() => this.#say(message), 0);
  }

  override destroy(): void {
    clearTimeout(this.#clearTimer);
    clearTimeout(this.#repeatTimer);
    super.destroy();
  }

  #say(message: string): void {
    this.update({ text: message });
    clearTimeout(this.#clearTimer);
    this.#clearTimer = setTimeout(() => this.update({ text: '' }), this.#clearAfterMs);
  }
}
