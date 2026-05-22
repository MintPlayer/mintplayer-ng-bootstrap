import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BsCalendarComponent } from './calendar.component';
describe('BsCalendarComponent', () => {
  let component: BsCalendarComponent;
  let fixture: ComponentFixture<BsCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsCalendarComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an mp-calendar inside its template', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mp-calendar')).not.toBeNull();
  });

  it('forwards selectedDate model into the WC', () => {
    const target = new Date(2026, 4, 20);
    component.selectedDate.set(target);
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-calendar') as HTMLElement & { selectedDate: Date };
    expect(wc.selectedDate.getDate()).toBe(20);
  });
});
