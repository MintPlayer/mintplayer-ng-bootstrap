import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { playlistTogglerCore, type PlaylistTogglerInputs, type PlaylistTogglerView } from './playlist-toggler.core';

afterEach(() => document.body.replaceChildren());

function mount(o: Partial<PlaylistTogglerInputs> = {}) {
  const markup = ({ view }: { view: PlaylistTogglerView }, host: HTMLElement) =>
    (applyBag(host, view.root), el('button', view.button, el('span', view.line)));
  const h = hostCore(playlistTogglerCore, { open: false, toggleOnClick: true, label: 'Playlist', controls: 'list', ...o }, { models: ['open'], markup });
  h.attach();
  return { ...h, button: () => h.host.querySelector('button')! };
}

describe('playlistTogglerCore', () => {
  it('is disabled until hydrated and names the playlist it controls', () => {
    const server = hostCore(playlistTogglerCore, { open: true, toggleOnClick: true, label: 'Playlist', controls: '' }, { models: ['open'], hydrated: false, label: 'Mine' });
    expect(server.props().view.button).toMatchObject({ class: 'playlist-toggler open', 'aria-label': 'Mine', 'aria-expanded': 'true', 'aria-controls': null, disabled: '' });
  });

  it('toggles on a click of its button only', () => {
    const h = mount();
    h.button().click();
    expect(h.state().open).toBe(true);
    h.host.click();
    h.button().click();
    expect(h.changes('open')).toEqual([true, false]);
  });

  it('leaves the state to the consumer without toggleOnClick, and follows it', () => {
    const h = mount({ toggleOnClick: false });
    h.button().click();
    expect(h.changes('open')).toEqual([]);
    h.setInputs({ open: true });
    expect(h.state().open).toBe(true);
    h.setInputs({ label: 'x' });
    h.setInputs({ open: false, toggleOnClick: true });
    h.button().click();
    h.setInputs({ open: true });
    expect(h.state().open).toBe(true);
    h.dispose();
  });
});
