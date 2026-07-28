import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsForwardAriaDirective } from './forward-aria.directive';

/**
 * Unit coverage for the forwarding contract itself, on a stand-in wrapper rather
 * than a real component — the 19-wrapper conformance matrix lives in
 * `_conformance/aria-passthrough.spec.ts` and would not isolate a bug in *this*
 * directive from a bug in a wrapper's template.
 *
 * The first test exists to pin down the one assumption the whole directive rests
 * on: that `inject(ElementRef, { skipSelf: true })` from a directive on a
 * component's template root resolves to the **component host**, not to the
 * directive's own element. If Angular ever changes that, everything else here
 * still passes while forwarding silently reads the wrong element.
 */
@Component({
  selector: 'bs-stand-in',
  template: `<mp-stand-in bsForwardAria><ng-content /></mp-stand-in>`,
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StandInWrapper {}

async function render(template: string) {
  @Component({ imports: [StandInWrapper], template, schemas: [CUSTOM_ELEMENTS_SCHEMA] })
  class Harness {
    readonly label = signal('first');
    readonly expanded = signal(false);
  }

  await TestBed.configureTestingModule({ imports: [Harness] }).compileComponents();
  const fixture = TestBed.createComponent(Harness);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  const host = fixture.nativeElement.querySelector('bs-stand-in') as HTMLElement;
  const target = fixture.nativeElement.querySelector('mp-stand-in') as HTMLElement;
  return { fixture, host, target, component: fixture.componentInstance as Harness };
}

describe('BsForwardAriaDirective', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('resolves the wrapper host via skipSelf, not its own element', async () => {
    const { host, target } = await render(`<bs-stand-in aria-label="probe"></bs-stand-in>`);

    expect(host.tagName.toLowerCase()).toBe('bs-stand-in');
    // Proof the directive read the HOST: the value only exists there.
    expect(target.getAttribute('aria-label')).toBe('probe');
  });

  it('copies every aria-* attribute to the target', async () => {
    const { target } = await render(
      `<bs-stand-in aria-label="probe" aria-describedby="hint" aria-expanded="true"></bs-stand-in>`,
    );

    expect(target.getAttribute('aria-label')).toBe('probe');
    expect(target.getAttribute('aria-describedby')).toBe('hint');
    expect(target.getAttribute('aria-expanded')).toBe('true');
  });

  it('leaves copied aria-* on the host (they are harmless there, and consumer CSS may match them)', async () => {
    const { host } = await render(`<bs-stand-in aria-label="probe"></bs-stand-in>`);
    expect(host.getAttribute('aria-label')).toBe('probe');
  });

  it('MOVES role, id and tabindex — the target gains them and the host loses them', async () => {
    const { host, target } = await render(
      `<bs-stand-in role="none" id="probe-id" tabindex="-1"></bs-stand-in>`,
    );

    expect(target.getAttribute('role')).toBe('none');
    expect(target.getAttribute('id')).toBe('probe-id');
    expect(target.getAttribute('tabindex')).toBe('-1');

    // Duplicated ids break every IDREF pointing at them, and a duplicated
    // tabindex IS the dead-tab-stop defect. Neither may remain.
    expect(host.hasAttribute('id')).toBe(false);
    expect(host.hasAttribute('tabindex')).toBe(false);
  });

  it('gives the host role="presentation" when the consumer set no role', async () => {
    const { host } = await render(`<bs-stand-in aria-label="probe"></bs-stand-in>`);
    expect(host.getAttribute('role')).toBe('presentation');
  });

  /* The SSR/rehydration case, and the one the original spec missed entirely.
     Every test here constructs a *pristine* host, so nothing exercised a host that
     already carried the marker before the directive initialised — which is exactly
     what the client sees after a server pass has serialised it. The old
     implementation tracked "did I write the marker?" in an instance field, and a
     fresh client instance answered "no", moved the marker onto the custom element,
     and discarded the forwarded name. Caught in a real browser against the SSR dev
     server, not by CI. */
  it('does not move a pre-existing presentation marker inward (post-SSR rehydration)', async () => {
    const { host, target } = await render(
      `<bs-stand-in role="presentation" aria-label="probe"></bs-stand-in>`,
    );

    // The marker stays where the server put it...
    expect(host.getAttribute('role')).toBe('presentation');
    // ...and must NOT be forwarded: a presentational custom element is removed from
    // the accessibility tree, so the name would have nowhere to land.
    expect(target.hasAttribute('role')).toBe(false);
    expect(target.getAttribute('aria-label')).toBe('probe');
  });

  it('still forwards role="none", which is a consumer statement rather than our marker', async () => {
    // The two are ARIA synonyms, so this asymmetry is deliberate and worth pinning:
    // only `presentation` is claimed by the directive.
    const { target } = await render(`<bs-stand-in role="none"></bs-stand-in>`);
    expect(target.getAttribute('role')).toBe('none');
  });

  it('is idempotent when applied twice to an already-forwarded host', async () => {
    // Second pass over its own output must be a no-op, which is the general property
    // the SSR case is one instance of.
    const { host, target } = await render(
      `<bs-stand-in role="group" id="probe-id" tabindex="0"></bs-stand-in>`,
    );
    expect(target.getAttribute('role')).toBe('group');

    host.setAttribute('aria-label', 'trigger another pass');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(target.getAttribute('role')).toBe('group');
    expect(target.getAttribute('id')).toBe('probe-id');
    expect(target.getAttribute('tabindex')).toBe('0');
    expect(host.getAttribute('role')).toBe('presentation');
  });

  it('does not let its own presentation marker overwrite the consumer role on the target', async () => {
    // The regression this guards: forward() writes role="presentation" on the
    // host, which fires the MutationObserver; a naive second pass moves that
    // marker onto the target and destroys the consumer's role.
    const { host, target } = await render(`<bs-stand-in role="group"></bs-stand-in>`);

    expect(target.getAttribute('role')).toBe('group');
    expect(host.getAttribute('role')).toBe('presentation');

    // Force extra observer passes and confirm it is stable, not merely correct once.
    host.setAttribute('aria-label', 'later');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(target.getAttribute('role')).toBe('group');
  });

  it('keeps aria-* live when the consumer changes a binding', async () => {
    const { fixture, target, component } = await render(
      `<bs-stand-in [attr.aria-label]="label()" [attr.aria-expanded]="expanded()"></bs-stand-in>`,
    );

    expect(target.getAttribute('aria-label')).toBe('first');
    expect(target.getAttribute('aria-expanded')).toBe('false');

    component.label.set('second');
    component.expanded.set(true);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // PRD 11a: an exposed state attribute must be correct at every moment, not
    // only at first render.
    expect(target.getAttribute('aria-label')).toBe('second');
    expect(target.getAttribute('aria-expanded')).toBe('true');
  });

  it('forwards a moved attribute that appears only after first render', async () => {
    const { host, target } = await render(`<bs-stand-in></bs-stand-in>`);
    expect(target.hasAttribute('tabindex')).toBe(false);

    host.setAttribute('tabindex', '0');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(target.getAttribute('tabindex')).toBe('0');
    expect(host.hasAttribute('tabindex')).toBe(false);
  });

  it('does not invent attributes the consumer never set', async () => {
    const { target } = await render(`<bs-stand-in></bs-stand-in>`);

    expect(target.hasAttribute('aria-label')).toBe(false);
    expect(target.hasAttribute('id')).toBe(false);
    expect(target.hasAttribute('tabindex')).toBe(false);
    // No consumer role, so nothing was moved — the marker belongs on the host only.
    expect(target.hasAttribute('role')).toBe(false);
  });
});
