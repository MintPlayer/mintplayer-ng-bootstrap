import { Component, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsProgressBarComponent } from './progress-bar.component';

describe('BsProgressBarComponent', () => {
  let component: BsProgressBarComponent;
  let fixture: ComponentFixture<BsProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsProgressBarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsProgressBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

/**
 * The host `[class]` binding to the computed colour class has been reported as
 * clobbering consumer-supplied classes. It does not, and these assertions exist
 * so it stops being re-reported.
 *
 * Angular compiles `[class]` to the `ɵɵclassMap` styling instruction, not to
 * `setAttribute('class', …)`. classMap writes only the keys it owns, through a
 * precedence stack in which a consumer's static `class` sits three tiers above
 * a COMPONENT host binding — so the two compose, and a colour change reconciles
 * (the old `bg-*` goes, the consumer's classes stay).
 */
@Component({
  imports: [BsProgressBarComponent],
  template: `
    <bs-progress-bar
      class="mt-3 consumer-static"
      [color]="color()"
      [striped]="true"
      [value]="50"
    ></bs-progress-bar>
  `,
})
class HostComponent {
  // A signal, not a mutable field: a plain-field write notifies nothing, so
  // detectChanges() would not re-evaluate the binding.
  readonly color = signal<Color>(Color.primary);
}

describe('BsProgressBarComponent host classes', () => {
  let fixture: ComponentFixture<HostComponent>;
  let bar: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    bar = fixture.nativeElement.querySelector('bs-progress-bar');
  });

  it('keeps consumer-supplied static classes alongside the computed colour class', () => {
    expect(bar.classList.contains('mt-3')).toBe(true);
    expect(bar.classList.contains('consumer-static')).toBe(true);
    expect(bar.classList.contains('bg-primary')).toBe(true);
    expect(bar.classList.contains('progress-bar')).toBe(true);
    expect(bar.classList.contains('progress-bar-striped')).toBe(true);
  });

  it('reconciles the colour class on change without dropping consumer classes', () => {
    fixture.componentInstance.color.set(Color.danger);
    fixture.detectChanges();

    expect(bar.classList.contains('bg-danger')).toBe(true);
    expect(bar.classList.contains('bg-primary')).toBe(false);
    expect(bar.classList.contains('mt-3')).toBe(true);
    expect(bar.classList.contains('consumer-static')).toBe(true);
  });

  it('leaves imperatively added classes alone — they are never in the managed set', () => {
    bar.classList.add('added-imperatively');
    fixture.componentInstance.color.set(Color.danger);
    fixture.detectChanges();

    expect(bar.classList.contains('added-imperatively')).toBe(true);
  });
});
