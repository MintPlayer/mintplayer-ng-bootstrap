import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsRatingComponent } from './rating.component';

@Component({
  selector: 'bs-rating-aria-harness',
  imports: [BsRatingComponent],
  template: `<bs-rating [maximum]="5" [(value)]="value"></bs-rating>`,
})
class HarnessComponent {
  value = signal(3);
}

describe('BsRatingComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => fixture.nativeElement.remove());

  const buttons = () => Array.from(fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
  const press = (key: string) => {
    const target = buttons()[host.value() - 1];
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  it('roving tabindex: only the checked radio is tabindex=0; others -1', () => {
    const tabindexes = buttons().map(b => b.getAttribute('tabindex'));
    expect(tabindexes).toEqual(['-1', '-1', '0', '-1', '-1']); // value=3
  });

  it('ArrowRight increments value and roving tabindex follows', () => {
    press('ArrowRight');
    expect(host.value()).toBe(4);
    expect(buttons().map(b => b.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1', '0', '-1']);
  });

  it('ArrowLeft decrements value', () => {
    press('ArrowLeft');
    expect(host.value()).toBe(2);
  });

  it('Home jumps to 1, End jumps to maximum', () => {
    press('Home');
    expect(host.value()).toBe(1);
    press('End');
    expect(host.value()).toBe(5);
  });

  it('ArrowRight at maximum stays clamped (no wrap)', () => {
    host.value.set(5);
    fixture.detectChanges();
    press('ArrowRight');
    expect(host.value()).toBe(5);
  });

  it('ArrowLeft at minimum stays clamped', () => {
    host.value.set(1);
    fixture.detectChanges();
    press('ArrowLeft');
    expect(host.value()).toBe(1);
  });
});
