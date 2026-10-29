import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
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
  template: `<bs-input-group [size]="size()" class="extra"><input type="text" class="form-control" /></bs-input-group>`,
})
class HostComponent {
  size = signal<BsInputGroupSize>('md');
}

describe('BsInputGroupComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const group = () => fixture.nativeElement.querySelector('bs-input-group') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('is the .input-group itself, with its content as direct children', () => {
    expect(fixture.nativeElement.querySelector('mp-input-group')).toBeNull();
    expect(group().classList.contains('input-group')).toBe(true);
    expect(group().getAttribute('data-mps')).toBe('input-group');
    expect(group().querySelector(':scope > input.form-control')).toBeTruthy();
  });

  it('keeps a consumer class next to its own', () => {
    expect(group().classList.contains('extra')).toBe(true);
  });

  it('maps sm/lg to Bootstrap classes and md to none', () => {
    expect(group().className).not.toMatch(/input-group-(sm|lg)/);

    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(group().classList.contains('input-group-lg')).toBe(true);

    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();
    expect(group().classList.contains('input-group-sm')).toBe(true);
    expect(group().classList.contains('input-group-lg')).toBe(false);

    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(group().className).not.toMatch(/input-group-(sm|lg)/);
  });

  it('has no role while unnamed', () => {
    expect(group().hasAttribute('role')).toBe(false);
  });
});

@Component({
  imports: [BsInputGroupComponent],
  template: `
    <bs-input-group id="named" aria-label="Amount"><input /></bs-input-group>
    <bs-input-group id="explicit" role="none" aria-label="Amount"><input /></bs-input-group>
  `,
})
class NamedHostComponent {}

describe('BsInputGroupComponent role', () => {
  it('is a group once named, and an explicit role wins', async () => {
    await TestBed.configureTestingModule({ imports: [NamedHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(NamedHostComponent);
    fixture.detectChanges();
    const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;

    expect(el('named').getAttribute('role')).toBe('group');
    expect(el('named').getAttribute('aria-label')).toBe('Amount');
    expect(el('explicit').getAttribute('role')).toBe('none');
  });
});
