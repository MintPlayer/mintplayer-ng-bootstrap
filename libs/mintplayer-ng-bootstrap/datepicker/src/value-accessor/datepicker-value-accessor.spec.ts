import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { formatPickedDate } from '@mintplayer/ui-core/datepicker';
import { BsDatepickerComponent } from '../generated';

/**
 * The accessor and validator of the generated `bs-datepicker` (#437): a form
 * value drives the display, a picked day reaches the form, a form write never
 * echoes back, and min / max / disableDateFn validate the value.
 */

@Component({
  imports: [BsDatepickerComponent, ReactiveFormsModule],
  template: `<bs-datepicker [formControl]="ctrl" [min]="min()" [disableDateFn]="disable" locale="en-US"></bs-datepicker>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<Date | null>(new Date(2026, 4, 13));
  readonly min = signal<Date | null>(null);
  readonly disable = (date: Date) => date.getDate() === 1;
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
const field = (f: ComponentFixture<unknown>) => root(f).querySelector('input.datepicker-input') as HTMLInputElement;

describe('BsDatepickerValueAccessor with Angular forms', () => {
  it('shows the form value and stays pristine', async () => {
    const f = await create();
    expect(field(f).value).toBe(formatPickedDate(new Date(2026, 4, 13), 'en-US'));
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('reports a picked day to the form', async () => {
    const f = await create();
    (root(f).querySelector('[data-date="2026-05-21"]') as HTMLElement).click();
    await settle(f);
    expect(f.componentInstance.ctrl.value?.getDate()).toBe(21);
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('a form write, even null, reaches the field without marking the control dirty', async () => {
    const f = await create();
    f.componentInstance.ctrl.setValue(new Date(2026, 6, 4));
    await settle(f);
    expect(field(f).value).toBe(formatPickedDate(new Date(2026, 6, 4), 'en-US'));
    f.componentInstance.ctrl.setValue(null);
    await settle(f);
    expect(field(f).value).toBe('');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('validates against min and disableDateFn, and re-validates when min changes', async () => {
    const f = await create();
    expect(f.componentInstance.ctrl.errors).toBeNull();
    f.componentInstance.min.set(new Date(2026, 5, 1));
    await settle(f);
    expect(f.componentInstance.ctrl.errors?.['min']).toBeTruthy();
    f.componentInstance.ctrl.setValue(new Date(2026, 6, 1));
    expect(f.componentInstance.ctrl.errors).toEqual({ disabledDate: true });
  });

  it('disables the field with the control', async () => {
    const f = await create();
    f.componentInstance.ctrl.disable();
    await settle(f);
    expect(field(f).disabled).toBe(true);
  });

  it('marks the control touched on focusout', async () => {
    const f = await create();
    field(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(f.componentInstance.ctrl.touched).toBe(true);
  });
});
