import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { colFormLabelCore, formControlCore, formCore, type FormInputs, type FormView } from './form.core';

afterEach(() => document.body.replaceChildren());

function mount(o: Partial<FormInputs> = {}) {
  const markup = ({ view }: { view: FormView }, host: HTMLElement) =>
    (applyBag(host, view.root), el('form', { ...view.form, action: view.action }, el('div', null)));
  const h = hostCore(formCore, { action: null, method: null, ...o }, { markup });
  h.attach();
  const submit = (target: Element = h.host.querySelector('form')!) => {
    const ev = new Event('submit', { bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev;
  };
  return { ...h, submit };
}

describe('formCore', () => {
  it('renders the method lowercased and the action only when set', () => {
    expect(hostCore(formCore, { action: '/save', method: 'POST' }).props().view).toMatchObject({ form: { method: 'post' }, action: '/save' });
    expect(hostCore(formCore, { action: '', method: null }).props().view).toMatchObject({ form: { method: null }, action: undefined });
    expect(hostCore(formControlCore, {}).props()).toEqual({ class: 'form-control' });
    expect(hostCore(colFormLabelCore, {}).props()).toEqual({ class: 'col-form-label' });
  });

  it('keeps a form without an action on the page and reports the submit', () => {
    const h = mount();
    const ev = h.submit();
    expect(ev.defaultPrevented).toBe(true);
    expect(h.events('submitted')).toEqual([ev]);
  });

  it('lets a form with an action submit, and ignores a nested form', () => {
    const h = mount({ action: '/save' });
    expect(h.submit().defaultPrevented).toBe(false);
    const nested = h.host.querySelector('form > div')!.appendChild(el('form'));
    expect(h.submit(nested).defaultPrevented).toBe(false);
    expect(h.events('submitted')).toHaveLength(1);
    h.dispose();
  });

  it('handles a submit on the host itself', () => {
    const h = mount();
    expect(h.submit(h.host).defaultPrevented).toBe(true);
  });
});
