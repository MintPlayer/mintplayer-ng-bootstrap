import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsMultiRangeComponent } from '../generated';

/**
 * The accessor of the generated `bs-multi-range` (#437): a form value drives the
 * native thumbs, a user's move reaches the form, and neither a form write nor
 * the normalisation of a null value echoes back as a change.
 */

@Component({
  imports: [BsMultiRangeComponent, ReactiveFormsModule],
  template: `<bs-multi-range [formControl]="ctrl" aria-label="Price"></bs-multi-range>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<number[] | null>([20, 80]);
}

async function create(): Promise<ComponentFixture<ReactiveHost>> {
  const f = TestBed.createComponent(ReactiveHost);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const thumbs = (f: ComponentFixture<unknown>) =>
  [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('bs-multi-range input.multi-range-thumb')];

async function settle(f: ComponentFixture<unknown>): Promise<void> {
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
}

describe('BsMultiRangeValueAccessor with Angular forms', () => {
  it('shows the form value on the thumbs, names the group, and stays pristine', async () => {
    const f = await create();
    expect(thumbs(f).map((t) => t.value)).toEqual(['20', '80']);
    const host = (f.nativeElement as HTMLElement).querySelector('bs-multi-range');
    expect(host?.getAttribute('role')).toBe('group');
    expect(host?.getAttribute('aria-label')).toBe('Price');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('reports a moved thumb to the form', async () => {
    const f = await create();
    thumbs(f)[0].value = '35';
    thumbs(f)[0].dispatchEvent(new Event('input', { bubbles: true }));
    await settle(f);
    expect(f.componentInstance.ctrl.value).toEqual([35, 80]);
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('a later form write, even null, reaches the thumbs without marking the control dirty', async () => {
    const f = await create();
    f.componentInstance.ctrl.setValue([10, 40]);
    await settle(f);
    expect(thumbs(f).map((t) => t.value)).toEqual(['10', '40']);
    f.componentInstance.ctrl.setValue(null);
    await settle(f);
    expect(thumbs(f).map((t) => t.value)).toEqual(['0', '100']);
    expect(f.componentInstance.ctrl.value).toBeNull();
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('disables the thumbs with the control', async () => {
    const f = await create();
    f.componentInstance.ctrl.disable();
    await settle(f);
    expect(thumbs(f).every((t) => t.disabled)).toBe(true);
  });

  it('marks the control touched on focusout', async () => {
    const f = await create();
    thumbs(f)[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(f.componentInstance.ctrl.touched).toBe(true);
  });
});
