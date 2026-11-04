import { describe, expect, it } from 'vitest';
import { connectPlaylistToggler } from './playlist-toggler.core';

const inputs = { label: 'Toggle playlist', controls: 'playlist' };

describe('playlist toggler', () => {
  it('is a named button whose aria-expanded follows open', () => {
    const closed = connectPlaylistToggler(inputs, false, true).button;
    expect(closed).toMatchObject({ type: 'button', 'aria-label': 'Toggle playlist', 'aria-expanded': 'false', 'aria-controls': 'playlist', disabled: null });
    expect(closed['class']).toBe('playlist-toggler');
    const open = connectPlaylistToggler(inputs, true, true).button;
    expect(open['aria-expanded']).toBe('true');
    expect(open['class']).toBe('playlist-toggler open');
  });

  it('a consumer aria-label wins over label', () => {
    expect(connectPlaylistToggler(inputs, false, true, 'Playlist').button['aria-label']).toBe('Playlist');
  });

  it('is disabled until hydrated (it cannot toggle without JS)', () => {
    expect(connectPlaylistToggler(inputs, false, false).button['disabled']).toBe('');
  });

  it('writes no aria-controls without a region', () => {
    expect(connectPlaylistToggler({ ...inputs, controls: null }, false, true).button['aria-controls']).toBeNull();
  });
});
