import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { BsInputGroupComponent } from './input-group.component';

@Component({
  imports: [BsInputGroupComponent],
  template: `<bs-input-group [size]="size"><input type="text" /></bs-input-group>`,
})
class HostComponent {
  size: 'sm' | 'md' | 'lg' = 'md';
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
    fixture.componentInstance.size = 'lg';
    fixture.detectChanges();
    expect(wc().getAttribute('size')).toBe('lg');
  });
});
