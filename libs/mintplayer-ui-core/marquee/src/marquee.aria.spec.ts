import { describe, expect, it } from 'vitest';
import { connectMarquee } from './marquee.core';

const inputs = { label: 'Headlines', pauseText: 'Pause', resumeText: 'Resume' };

describe('marquee', () => {
  it('is a named marquee region; a consumer aria-label wins', () => {
    expect(connectMarquee(inputs, false, true).region).toEqual({ class: 'marquee', role: 'marquee', 'aria-label': 'Headlines' });
    expect(connectMarquee(inputs, false, true, 'News').region['aria-label']).toBe('News');
  });

  it("the pause button's text says what it will do, with no pressed state", () => {
    const running = connectMarquee(inputs, false, true);
    expect(running.buttonText).toBe('Pause');
    expect(running.button['aria-pressed']).toBeUndefined();
    const paused = connectMarquee(inputs, true, true);
    expect(paused.buttonText).toBe('Resume');
    expect(paused.track['class']).toContain('marquee-paused');
  });

  it('hides the pause button until hydrated', () => {
    expect(connectMarquee(inputs, false, false).button['hidden']).toBe('');
    expect(connectMarquee(inputs, false, true).button['hidden']).toBeNull();
  });
});
