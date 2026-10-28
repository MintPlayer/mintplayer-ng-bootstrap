import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { MpSignaturePadElement, Signature } from '@mintplayer/web-components/signature-pad';
import { BsSignaturePadComponent } from '../component/signature-pad.component';

const DRAWN: Signature = { strokes: [{ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }] };

@Component({
  imports: [BsSignaturePadComponent, ReactiveFormsModule],
  template: `<bs-signature-pad [formControl]="ctrl"></bs-signature-pad>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<Signature>(DRAWN, { nonNullable: true });
}

async function create(): Promise<ComponentFixture<ReactiveHost>> {
  const f = TestBed.createComponent(ReactiveHost);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const host = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('bs-signature-pad') as HTMLElement;
const pad = (f: ComponentFixture<unknown>) => host(f).querySelector('mp-signature-pad') as MpSignaturePadElement;

describe('BsSignaturePadValueAccessor', () => {
  it('hands the form value to the pad', async () => {
    const f = await create();
    expect(pad(f).signature).toEqual(DRAWN);
  });

  it('reports what the user drew', async () => {
    const f = await create();
    const next: Signature = { strokes: [] };
    pad(f).dispatchEvent(new CustomEvent('signature-change', { detail: next }));
    expect(f.componentInstance.ctrl.value).toBe(next);
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('makes the pad inert while the control is disabled', async () => {
    const f = await create();
    f.componentInstance.ctrl.disable();
    f.detectChanges();
    expect(host(f).hasAttribute('inert')).toBe(true);
    expect(host(f).getAttribute('aria-disabled')).toBe('true');
    f.componentInstance.ctrl.enable();
    f.detectChanges();
    expect(host(f).hasAttribute('inert')).toBe(false);
  });
});
