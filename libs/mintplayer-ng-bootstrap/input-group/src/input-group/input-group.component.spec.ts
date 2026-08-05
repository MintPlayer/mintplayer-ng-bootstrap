import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsInputGroupComponent, type BsInputGroupSize } from './input-group.component';

/**
 * The host drives the input through a **signal**, not a mutable field. Under
 * Angular's signal-based change detection a plain-field write notifies nothing, so
 * `fixture.detectChanges()` does not re-evaluate the binding and the child's input
 * keeps its old value — verified: a literal binding and a signal host both
 * propagate, a mutated plain field does not.
 */
@Component({
  imports: [BsInputGroupComponent],
  template: `<bs-input-group [size]="size()"><input type="text" /></bs-input-group>`,
})
class HostComponent {
  size = signal<BsInputGroupSize>('md');
}

describe('BsInputGroupComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const wc = () => fixture.nativeElement.querySelector('mp-input-group') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders mp-input-group and projects its content into it', () => {
    expect(wc()).toBeTruthy();
    expect(wc().querySelector('input')).toBeTruthy();
  });

  it('writes sm/lg but never md — md is the absence of a size in Bootstrap', () => {
    expect(wc().hasAttribute('size')).toBe(false);

    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(wc().getAttribute('size')).toBe('lg');

    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();
    expect(wc().getAttribute('size')).toBe('sm');

    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(wc().hasAttribute('size')).toBe(false);
  });
});

/**
 * The blind spot that allowed PRD §14's defects: this spec slotted a bare `<input>`,
 * so nothing here ever exercised "an Angular WRAPPER slotted into the group" — and a
 * wrapper is what a real consumer writes. `mp-input-group` mirrors `size` onto its
 * children, but the child is `<bs-select>`, whose signal input cannot observe a
 * runtime `setAttribute`; the group has to descend to the `mp-select` inside it.
 *
 * The layout half of the same root cause needs a real engine and lives in
 * `apps/ng-bootstrap-demo-e2e/e2e/input-group.spec.ts`.
 */
@Component({
  imports: [BsInputGroupComponent, BsSelectComponent],
  template: `<bs-input-group [size]="size()"><bs-select></bs-select></bs-input-group>`,
})
class WrapperHostComponent {
  size = signal<BsInputGroupSize>('md');
}

describe('BsInputGroupComponent with a wrapped control', () => {
  let fixture: ComponentFixture<WrapperHostComponent>;
  const control = () => fixture.nativeElement.querySelector('bs-select mp-select') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WrapperHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(WrapperHostComponent);
    fixture.detectChanges();
  });

  it('mirrors size onto the control inside the wrapper, not onto the wrapper host', () => {
    const wrapperHost = fixture.nativeElement.querySelector('bs-select') as HTMLElement;

    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(control().getAttribute('size')).toBe('lg');
    // Writing it here is what used to happen, and it reached nothing.
    expect(wrapperHost.hasAttribute('size')).toBe(false);

    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(control().hasAttribute('size')).toBe(false);
  });
});
