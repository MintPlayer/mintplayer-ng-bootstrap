import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsModalHeaderDirective } from './modal-header.directive';

@Component({
  selector: 'bs-modal-header-host',
  imports: [BsModalHeaderDirective],
  template: `<div bsModalHeader>x</div>`,
})
class HostComponent {}

describe('BsModalHeaderDirective', () => {
  it('renders with .modal-header class and a generated id', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector<HTMLElement>('div')!;
    expect(el.classList.contains('modal-header')).toBe(true);
    expect(el.id).toMatch(/^bs-modal-header-\d+$/);
  });
});
