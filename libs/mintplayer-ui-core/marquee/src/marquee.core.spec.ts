import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { marqueeCore, type MarqueeView } from './marquee.core';

afterEach(() => document.body.replaceChildren());

describe('marqueeCore', () => {
  it('hides the pause button until hydrated and names the region', () => {
    const server = hostCore(marqueeCore, { label: null, pauseText: 'Pause', resumeText: 'Resume' }, { hydrated: false, label: 'News' });
    expect(server.props().view).toMatchObject({ region: { role: 'marquee', 'aria-label': 'News' }, button: { hidden: '' }, buttonText: 'Pause' });
    expect(hostCore(marqueeCore, { label: null, pauseText: 'P', resumeText: 'R' }).props().view.region['aria-label']).toBeNull();
  });

  it('pauses and resumes from its button only', () => {
    const markup = ({ view }: { view: MarqueeView }, host: HTMLElement) =>
      (applyBag(host, view.root), [el('div', view.region, el('div', view.track, 'Breaking')), el('button', view.button, view.buttonText)]);
    const h = hostCore(marqueeCore, { label: 'Ticker', pauseText: 'Pause', resumeText: 'Resume' }, { markup });
    h.attach();
    h.host.querySelector<HTMLElement>('.marquee')!.click();
    expect(h.state().paused).toBe(false);
    h.host.querySelector<HTMLElement>('.marquee-pause')!.click();
    expect(h.state().paused).toBe(true);
    h.render();
    expect(h.host.querySelector('.marquee-track')!.className).toContain('marquee-paused');
    expect(h.host.querySelector('.marquee-pause')!.textContent).toBe('Resume');
    h.dispose();
  });
});
