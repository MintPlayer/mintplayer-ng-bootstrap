import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Test-only: an in-memory stand-in for `BroadcastChannel`.
 *
 * Node's real BroadcastChannel crosses worker threads in one process, so under
 * `--pool=threads` a theme store in one spec file receives the modes another
 * spec file's store posts on 'bs-theme-mode' (store.spec.ts flaked on exactly
 * that). This fake lives in module state, and vitest gives every spec file its
 * own module graph, so the channel is scoped to the file that installs it.
 *
 * It keeps the platform contract the store relies on: a post is delivered to
 * every OTHER open channel of the same name, never to the sender, as a later
 * task, as a structured clone; nothing is delivered to a closed channel, and
 * posting on one throws. Every post is logged in `posted`, so a no-echo check
 * can count posts instead of waiting for silence.
 */
export class FakeBroadcastChannel {
  static readonly open = new Set<FakeBroadcastChannel>();
  static readonly posted: { name: string; data: unknown }[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  #closed = false;

  constructor(readonly name: string) {
    FakeBroadcastChannel.open.add(this);
  }

  postMessage(data: unknown): void {
    if (this.#closed) throw new DOMException('BroadcastChannel is closed', 'InvalidStateError');
    FakeBroadcastChannel.posted.push({ name: this.name, data });
    [...FakeBroadcastChannel.open]
      .filter((target) => target !== this && target.name === this.name)
      .map((target) => {
        const copy = structuredClone(data);
        return setTimeout(() => {
          if (!target.#closed) target.onmessage?.(new MessageEvent('message', { data: copy }));
        }, 0);
      });
  }

  close(): void {
    this.#closed = true;
    FakeBroadcastChannel.open.delete(this);
  }

  /** Close every channel and forget the post log. */
  static reset(): void {
    [...FakeBroadcastChannel.open].map((channel) => channel.close());
    FakeBroadcastChannel.posted.splice(0);
  }
}

/**
 * Replace the global `BroadcastChannel` with the fake around every test of the
 * calling spec file (or describe block), and reset it afterwards.
 */
export function installFakeBroadcastChannel(): typeof FakeBroadcastChannel {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });
  afterEach(() => {
    FakeBroadcastChannel.reset();
    vi.unstubAllGlobals();
  });
  return FakeBroadcastChannel;
}
