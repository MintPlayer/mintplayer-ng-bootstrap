import { beforeEach, describe, expect, it } from 'vitest';
import './mp-select';
import type { MpSelect } from './mp-select';

/**
 * Naming contract for `<mp-select>`, the control the audit found with **no**
 * fallback naming path at all — hence it is the first component in Phase B.
 *
 * The role lives on the inner `<select>`, not on the host, so every name has to
 * reach that element. The host deliberately gets **no** role: adding one would
 * announce the control twice, once for each.
 *
 * What is NOT here, and cannot be: the positive cross-root
 * `aria-labelledby` → `ariaLabelledByElements` assertion. jsdom implements neither
 * `ariaLabelledByElements` nor an accessibility tree, so that path is verified only
 * by spike 0.2 against a real one (spike 0.2 (verdict in docs/prd/screen-reader-accessibility-plan.md)). The degraded contract IS
 * asserted below, because that is the part CI can actually see.
 */
async function mount(html: string): Promise<{ host: MpSelect; select: HTMLSelectElement }> {
  document.body.innerHTML = html;
  const host = document.querySelector('mp-select') as MpSelect;
  await host.updateComplete;
  return { host, select: host.shadowRoot!.querySelector('select') as HTMLSelectElement };
}

const OPTIONS = '<option value="be">Belgium</option><option value="nl">Netherlands</option>';

describe('mp-select naming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the inner <select> from input-label', async () => {
    const { select } = await mount(`<mp-select input-label="Country">${OPTIONS}</mp-select>`);
    expect(select.getAttribute('aria-label')).toBe('Country');
  });

  it('names the inner <select> from the inputLabel property', async () => {
    const { host, select } = await mount(`<mp-select>${OPTIONS}</mp-select>`);
    host.inputLabel = 'Country';
    await host.updateComplete;
    expect(select.getAttribute('aria-label')).toBe('Country');
  });

  it('lets a host aria-label win over input-label', async () => {
    // aria-label is the more specific, more idiomatic thing to write, and
    // BsForwardAriaDirective copies it down from the Angular wrapper.
    const { select } = await mount(
      `<mp-select aria-label="From the host" input-label="From the property">${OPTIONS}</mp-select>`,
    );
    expect(select.getAttribute('aria-label')).toBe('From the host');
  });

  it('keeps the name live when input-label changes', async () => {
    // PRD 11a: correct at every moment, not only at first render.
    const { host, select } = await mount(`<mp-select input-label="First">${OPTIONS}</mp-select>`);
    expect(select.getAttribute('aria-label')).toBe('First');

    host.setAttribute('input-label', 'Second');
    await host.updateComplete;
    expect(select.getAttribute('aria-label')).toBe('Second');
  });

  it('removes the name when input-label is removed rather than freezing it', async () => {
    const { host, select } = await mount(`<mp-select input-label="First">${OPTIONS}</mp-select>`);
    host.removeAttribute('input-label');
    await host.updateComplete;
    expect(select.hasAttribute('aria-label')).toBe(false);
  });

  it('leaves the inner <select> unnamed when the consumer names nothing', async () => {
    // Asserted rather than assumed: a component that invents a name is worse than
    // one with none, because the invented name looks correct in an audit.
    const { select } = await mount(`<mp-select>${OPTIONS}</mp-select>`);
    expect(select.hasAttribute('aria-label')).toBe(false);
  });

  it('gives the host no role, so the control is announced once', async () => {
    const { host } = await mount(`<mp-select input-label="Country">${OPTIONS}</mp-select>`);
    expect(host.hasAttribute('role')).toBe(false);
  });

  it('survives an aria-labelledby it cannot honour in this environment', async () => {
    /* The degraded path, which is the only one jsdom can reach. It must not throw
       and must not fabricate a name — a stale or invented name is worse than a
       missing one, because it silences the audit without helping the user. The
       component's documented fallback is `input-label`. */
    const { host, select } = await mount(
      `<span id="outer">Country</span><mp-select aria-labelledby="outer">${OPTIONS}</mp-select>`,
    );

    expect(select.hasAttribute('aria-label')).toBe(false);
    // Specifically NOT copied inward as an IDREF string: it would resolve against
    // the shadow root, where `#outer` does not exist, and be silently dead — the
    // exact defect found in mp-checkbox.
    expect(select.hasAttribute('aria-labelledby')).toBe(false);
    expect(host.isConnected).toBe(true);
  });

  it('still applies input-label alongside an unresolvable aria-labelledby', async () => {
    const { select } = await mount(
      `<mp-select aria-labelledby="missing" input-label="Country">${OPTIONS}</mp-select>`,
    );
    expect(select.getAttribute('aria-label')).toBe('Country');
  });
});

/**
 * The `error-text` channel — the validation message rendered inside this shadow
 * root, because a consumer's own `<small>` sits outside it where an IDREF from the
 * `<select>` cannot reach. `mp-checkbox`'s aria spec carries the full rationale.
 *
 * The liveness tests here are not ceremony: `invalid` and `required` were listed in
 * this element's `attributeChangedCallback` but missing from `observedAttributes`,
 * so the callback never fired for them and `aria-invalid` was frozen at whatever the
 * first render saw. A form mirrors validity only after the control is touched, i.e.
 * always later than that.
 */
describe('mp-select error-text', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const feedback = (host: MpSelect) => host.shadowRoot!.querySelector('.invalid-feedback');

  it('renders no message and no references while the control is valid', async () => {
    const { host, select } = await mount(
      `<mp-select error-text="Choose a country.">${OPTIONS}</mp-select>`,
    );
    expect(feedback(host)).toBeNull();
    expect(select.hasAttribute('aria-errormessage')).toBe(false);
    expect(select.hasAttribute('aria-describedby')).toBe(false);
  });

  it('renders the message and BOTH references when invalid, resolving in this shadow root', async () => {
    const { host, select } = await mount(
      `<mp-select invalid error-text="Choose a country.">${OPTIONS}</mp-select>`,
    );
    const id = select.getAttribute('aria-errormessage');

    expect(id).toBeTruthy();
    expect(select.getAttribute('aria-describedby')).toBe(id);
    expect(host.shadowRoot!.getElementById(id!)).toBe(feedback(host));
    expect(feedback(host)!.textContent).toBe('Choose a country.');
  });

  it('appears when the control turns invalid after render — PRD 11a', async () => {
    const { host, select } = await mount(
      `<mp-select error-text="Choose a country.">${OPTIONS}</mp-select>`,
    );
    expect(feedback(host)).toBeNull();

    host.setAttribute('invalid', '');
    await host.updateComplete;

    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-errormessage')).toBe(feedback(host)!.id);
  });

  it('removes the node AND both references again when validity clears', async () => {
    const { host, select } = await mount(
      `<mp-select invalid error-text="Choose a country.">${OPTIONS}</mp-select>`,
    );
    host.removeAttribute('invalid');
    await host.updateComplete;

    expect(select.hasAttribute('aria-invalid')).toBe(false);
    expect(feedback(host)).toBeNull();
    expect(select.hasAttribute('aria-errormessage')).toBe(false);
    expect(select.hasAttribute('aria-describedby')).toBe(false);
  });

  it('mirrors a late `required` too, for the same reason', async () => {
    const { host, select } = await mount(`<mp-select>${OPTIONS}</mp-select>`);
    host.setAttribute('required', '');
    await host.updateComplete;

    expect(select.getAttribute('aria-required')).toBe('true');
  });
});
