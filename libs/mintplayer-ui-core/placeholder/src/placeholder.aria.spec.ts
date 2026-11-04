import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectPlaceholder, placeholderCore, PLACEHOLDER_CLEAR_MS, type PlaceholderInputs } from './placeholder.core';

describe('placeholder', () => {
  afterEach(() => vi.useRealTimers());

  it('is busy and glowing only while loading', () => {
    expect(connectPlaceholder({ loading: true, loadedText: 'x' }, '').root).toEqual({ class: 'placeholder-region placeholder-glow', 'aria-busy': 'true' });
    expect(connectPlaceholder({ loading: false, loadedText: 'x' }, '').root).toEqual({ class: 'placeholder-region', 'aria-busy': null });
  });

  it('always renders its status node, so the message is a text change, never an inserted region', () => {
    expect(connectPlaceholder({ loading: true, loadedText: 'x' }, '').status).toEqual({ class: 'visually-hidden', role: 'status' });
  });

  it('says the loaded text once when loading ends, then clears', () => {
    vi.useFakeTimers();
    let inputs: PlaceholderInputs = { loading: false, loadedText: 'Klaar met laden' };
    let state = { message: '' };
    const api = {
      host: document.createElement('div'),
      inputs: () => inputs,
      state: () => state,
      setState: (patch: Partial<typeof state>) => (state = { ...state, ...patch }),
      emit: () => undefined,
    };
    const prev = { loading: true, loadedText: 'Klaar met laden' };
    placeholderCore.inputsChanged!(api as never, prev);
    expect(state.message).toBe('Klaar met laden');
    vi.advanceTimersByTime(PLACEHOLDER_CLEAR_MS);
    expect(state.message).toBe('');
    // Starting to load says nothing.
    inputs = { ...inputs, loading: true };
    placeholderCore.inputsChanged!(api as never, { ...inputs, loading: false });
    expect(state.message).toBe('');
  });
});
