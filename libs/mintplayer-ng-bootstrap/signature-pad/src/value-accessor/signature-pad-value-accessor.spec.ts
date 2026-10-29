import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Signature } from '@mintplayer/ui-core/signature-pad';
import { BsSignaturePadComponent } from '../generated';

/**
 * The accessor of the generated `bs-signature-pad` (#437): a form value drives
 * the pad, what the user types reaches the form, a form write never echoes back,
 * and a disabled control makes every control inert.
 */

const DRAWN: Signature = { strokes: [{ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }], text: 'Ada' };

@Component({
  imports: [BsSignaturePadComponent, ReactiveFormsModule],
  template: `<bs-signature-pad [formControl]="ctrl"></bs-signature-pad>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<Signature | null>(DRAWN, Validators.required);
}

async function settle(f: ComponentFixture<unknown>): Promise<void> {
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
}

async function create(): Promise<ComponentFixture<ReactiveHost>> {
  const f = TestBed.createComponent(ReactiveHost);
  await settle(f);
  return f;
}

const root = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const typed = (f: ComponentFixture<unknown>) => root(f).querySelector('input.signature-pad-text') as HTMLInputElement;
const clear = (f: ComponentFixture<unknown>) => root(f).querySelector('.signature-pad-clear') as HTMLButtonElement;

describe('BsSignaturePadValueAccessor with Angular forms', () => {
  it('shows the form value and stays pristine', async () => {
    const f = await create();
    expect(typed(f).value).toBe('Ada');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('reports what the user types, and Clear, to the form', async () => {
    const f = await create();
    typed(f).value = 'Ada Lovelace';
    typed(f).dispatchEvent(new Event('input', { bubbles: true }));
    await settle(f);
    expect(f.componentInstance.ctrl.value?.text).toBe('Ada Lovelace');
    expect(f.componentInstance.ctrl.dirty).toBe(true);
    clear(f).click();
    await settle(f);
    expect(f.componentInstance.ctrl.value).toEqual({ strokes: [] });
  });

  it('a form write, even null, reaches the pad without marking the control dirty', async () => {
    const f = await create();
    f.componentInstance.ctrl.setValue({ strokes: [], text: 'Grace' });
    await settle(f);
    expect(typed(f).value).toBe('Grace');
    f.componentInstance.ctrl.setValue(null);
    await settle(f);
    expect(typed(f).value).toBe('');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('disables every control while the form control is disabled', async () => {
    const f = await create();
    f.componentInstance.ctrl.disable();
    await settle(f);
    expect(typed(f).disabled).toBe(true);
    expect(clear(f).disabled).toBe(true);
    f.componentInstance.ctrl.enable();
    await settle(f);
    expect(typed(f).disabled).toBe(false);
  });

  it('carries the required flag onto the typed field', async () => {
    const f = await create();
    expect(typed(f).required).toBe(true);
  });
});
