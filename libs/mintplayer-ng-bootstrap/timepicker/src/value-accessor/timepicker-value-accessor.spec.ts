import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsTimepickerComponent } from '../generated';

/**
 * The accessor and validator of the generated `bs-timepicker` (#437): a form
 * value drives the display, a picked slot reaches the form, a form write never
 * echoes back, and min / max validate the time of day.
 */

@Component({
  imports: [BsTimepickerComponent, ReactiveFormsModule],
  template: `<bs-timepicker [formControl]="ctrl" [min]="min()" locale="en-GB"></bs-timepicker>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<Date | null>(new Date(2026, 4, 13, 9, 30));
  readonly min = signal<Date | null>(null);
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
const field = (f: ComponentFixture<unknown>) => root(f).querySelector('input.timepicker-input') as HTMLInputElement;

describe('BsTimepickerValueAccessor with Angular forms', () => {
  it('shows the form value and stays pristine', async () => {
    const f = await create();
    expect(field(f).value).toBe('09:30');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('reports a picked slot to the form, keeping its date', async () => {
    const f = await create();
    (root(f).querySelector('[data-minutes="615"]') as HTMLElement).click();
    await settle(f);
    const value = f.componentInstance.ctrl.value;
    expect([value?.getDate(), value?.getHours(), value?.getMinutes()]).toEqual([13, 10, 15]);
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('a form write, even null, reaches the field without marking the control dirty', async () => {
    const f = await create();
    f.componentInstance.ctrl.setValue(new Date(2026, 4, 13, 18, 0));
    await settle(f);
    expect(field(f).value).toBe('18:00');
    f.componentInstance.ctrl.setValue(null);
    await settle(f);
    expect(field(f).value).toBe('');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('validates the time of day against min, and re-validates when min changes', async () => {
    const f = await create();
    expect(f.componentInstance.ctrl.errors).toBeNull();
    f.componentInstance.min.set(new Date(2000, 0, 1, 10, 0));
    await settle(f);
    expect(f.componentInstance.ctrl.errors?.['min']).toBeTruthy();
  });

  it('disables the field with the control', async () => {
    const f = await create();
    f.componentInstance.ctrl.disable();
    await settle(f);
    expect(field(f).disabled).toBe(true);
  });
});
