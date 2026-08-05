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
