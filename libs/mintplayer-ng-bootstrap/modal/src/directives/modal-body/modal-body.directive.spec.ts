import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsModalBodyDirective } from './modal-body.directive';
@Component({
  selector: 'bs-modal-body-host',
  imports: [BsModalBodyDirective],
  template: `<div bsModalBody>x</div>`,
})
class HostComponent {}

describe('BsModalBodyDirective', () => {
  it('renders with .modal-body class and a generated id', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector<HTMLElement>('div')!;
    expect(el.classList.contains('modal-body')).toBe(true);
    expect(el.id).toMatch(/^bs-modal-body-\d+$/);
  });
});
