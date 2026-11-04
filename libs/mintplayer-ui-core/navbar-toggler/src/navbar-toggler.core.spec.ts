import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { navbarTogglerCore, type NavbarTogglerInputs, type NavbarTogglerView } from './navbar-toggler.core';

afterEach(() => document.body.replaceChildren());

function mount(o: Partial<NavbarTogglerInputs> = {}) {
  const markup = ({ view }: { view: NavbarTogglerView }, host: HTMLElement) =>
    (applyBag(host, view.root), el('button', view.button, el('span', view.line)));
  const h = hostCore(navbarTogglerCore, { open: false, toggleOnClick: true, label: 'Menu', controls: 'nav', ...o }, { models: ['open'], markup });
  h.attach();
  return { ...h, button: () => h.host.querySelector('button')! };
}

describe('navbarTogglerCore', () => {
  it('is disabled until hydrated and names the region it controls', () => {
    const server = hostCore(navbarTogglerCore, { open: true, toggleOnClick: true, label: 'Menu', controls: '' }, { models: ['open'], hydrated: false, label: 'Mine' });
    expect(server.props().view.button).toMatchObject({ class: 'navbar-toggler open', 'aria-label': 'Mine', 'aria-expanded': 'true', 'aria-controls': null, disabled: '' });
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
