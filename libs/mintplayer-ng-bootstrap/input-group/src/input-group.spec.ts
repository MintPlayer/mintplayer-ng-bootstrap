import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { BsInputGroupComponent } from './generated';
import type { InputGroupSize } from '@mintplayer/ui-core/input-group';

/**
 * The generated `bs-input-group` (#458 M3). The host drives the inputs through
 * signals: a plain-field write notifies nothing under signal-based change
 * detection (CLAUDE.md).
 */
@Component({
  imports: [BsInputGroupComponent],
  template: `<bs-input-group [size]="size()" [label]="label()" class="extra"><input type="text" class="form-control" /></bs-input-group>`,
})
class HostComponent {
  readonly size = signal<InputGroupSize>('md');
  readonly label = signal<string | null>(null);
}

describe('BsInputGroupComponent (generated)', () => {
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

  it('is a group only while it has a label', () => {
    expect(group().hasAttribute('role')).toBe(false);
    expect(group().hasAttribute('aria-label')).toBe(false);
    fixture.componentInstance.label.set('Amount');
    fixture.detectChanges();
    expect(group().getAttribute('role')).toBe('group');
    expect(group().getAttribute('aria-label')).toBe('Amount');
    fixture.componentInstance.label.set(null);
    fixture.detectChanges();
    expect(group().hasAttribute('role')).toBe(false);
  });
});
